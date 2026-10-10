"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { RafalModal } from "@/components/ui/rafal-modal";
import { VariantAttributeValue } from "@/components/ui/variant-attribute-value";
import { addCartLine } from "@/features/cart/actions/add-cart-line";
import {
  currentCartQueryOptions,
  currentCartQueryKey,
  setCurrentCartQueryData,
} from "@/features/cart/api/cart-query";
import type {
  AddCartLineError,
  AddCartLineInput,
} from "@/features/cart/types/cart.types";
import { useBrowsingCity } from "@/features/location/components/browsing-city-provider";
import { quickAddSelectionQueryOptions } from "@/features/products/api/quick-add-selection.client";
import type { QuickAddSelectionVariant } from "@/features/products/types/quick-add-selection.types";
import {
  canSubmitQuickAddSelection,
  getQuickAddFailureRefreshTargets,
  getQuickAddRemainingQuantity,
  quickAddCityContextMatches,
} from "@/features/products/utils/quick-add-selection";
import {
  isProductOptionValueAvailable,
  resolveProductVariant,
  type SelectedProductOptions,
} from "@/features/products/utils/product-variant-resolver";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/api-error";
import { rafalToast } from "@/lib/rafal-toast";
import { cn } from "@/lib/utils";
import { getVariantAttributeLabel } from "@/lib/variant-attributes";

type ProductQuickAddSheetProps = {
  cityId: number;
  locale: Locale;
  onOpenChange: (open: boolean) => void;
  productName: string;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  slug: string;
};

function getAddErrorKey(error: AddCartLineError) {
  switch (error.code) {
    case "location-required":
      return "errors.locationRequired";
    case "unavailable-at-location":
      return "errors.unavailableAtLocation";
    case "out-of-stock":
      return "errors.outOfStock";
    case "quantity-limit-exceeded":
      return "errors.quantityLimit";
    case "product-unavailable":
      return "errors.productUnavailable";
    case "variant-invalid":
      return "errors.variantInvalid";
    case "cart-session-failure":
      return "errors.cartSessionFailure";
    case "invalid-input":
    case "invalid-personalization":
    case "validation-rejected":
    case "line-not-found":
    case "service-unavailable":
      return "errors.serviceUnavailable";
  }
}

function getReadErrorKey(error: unknown) {
  if (!(error instanceof ApiError)) return "sheet.readError";
  if (error.code === "product-unavailable") return "sheet.productUnavailable";
  if (error.code === "product-configuration-invalid") {
    return "sheet.productConfigurationInvalid";
  }
  if (error.code === "location-required") return "errors.locationRequired";
  if (error.code === "city-context-changed") return "sheet.cityChanged";
  return "sheet.readError";
}

function formatPrice(locale: Locale, variant: QuickAddSelectionVariant) {
  const currency = new Intl.NumberFormat(locale, {
    currency: variant.pricing.current.currency,
    style: "currency",
  });
  return {
    current: currency.format(variant.pricing.current.amount),
    compareAt: variant.pricing.compareAt
      ? currency.format(variant.pricing.compareAt.amount)
      : null,
  };
}

export function ProductQuickAddSheet({
  cityId,
  locale,
  onOpenChange,
  productName,
  returnFocusRef,
  slug,
}: ProductQuickAddSheetProps) {
  const t = useTranslations("Common.productListing.quickAdd");
  const optionInputPrefix = useId();
  const queryClient = useQueryClient();
  const { committedCity, isChanging: cityTransitionLocked } = useBrowsingCity();
  const [selectedOptions, setSelectedOptions] =
    useState<SelectedProductOptions>({});
  const [quantity, setQuantity] = useState(1);
  const activationLockedRef = useRef(false);
  const selectionQueryOptions = quickAddSelectionQueryOptions(
    locale,
    slug,
    cityId,
  );
  const selectionQuery = useQuery({
    ...selectionQueryOptions,
    refetchOnMount: "always",
  });
  const cartQuery = useQuery({
    ...currentCartQueryOptions(locale, null),
    refetchOnMount: "always",
    staleTime: 0,
  });
  const selection =
    selectionQuery.data?.kind === "selection"
      ? selectionQuery.data.data
      : null;
  const variant = selection
    ? resolveProductVariant(selection.product.variants, selectedOptions)
    : null;
  const availability = variant?.availability ?? null;
  const remainingAddable =
    variant && availability?.status === "available"
      ? getQuickAddRemainingQuantity(
          availability.maxOrderQuantity,
          cartQuery.data,
          variant.id,
        )
      : null;
  const contextMatches = quickAddCityContextMatches(
    selection?.city.id ?? null,
    committedCity?.id ?? null,
  );
  const mutation = useMutation({
    mutationFn: (input: AddCartLineInput) => addCartLine(input, locale),
    retry: false,
    onSuccess: (result) => {
      if (!result.ok) {
        const refreshTargets = getQuickAddFailureRefreshTargets(
          result.error.code,
        );
        if (refreshTargets.selection) {
          void queryClient.invalidateQueries({
            exact: true,
            queryKey: selectionQueryOptions.queryKey,
          });
        }
        if (refreshTargets.canonicalCart) {
          void queryClient.invalidateQueries({
            exact: true,
            queryKey: currentCartQueryKey(locale, null),
          });
        }
        return;
      }
      setCurrentCartQueryData(queryClient, locale, result.cart);
      onOpenChange(false);
      rafalToast.success(
        t("success", { name: selection?.product.name ?? productName }),
      );
    },
    onSettled: () => {
      activationLockedRef.current = false;
    },
  });
  const mutationError = mutation.isError
    ? ({ code: "service-unavailable" } satisfies AddCartLineError)
    : mutation.data && !mutation.data.ok
      ? mutation.data.error
      : null;
  const canAdd =
    !selectionQuery.isFetching &&
    canSubmitQuickAddSelection({
      availability,
      cityContextMatches: contextMatches,
      cityTransitionLocked,
      mutationLocked: mutation.isPending,
      quantity,
      remainingAddable,
      variantId: variant?.id ?? null,
    });

  const handleAdd = () => {
    if (
      !selection ||
      !variant ||
      !canSubmitQuickAddSelection({
        availability: variant.availability,
        cityContextMatches: quickAddCityContextMatches(
          selection?.city.id ?? null,
          committedCity?.id ?? null,
        ),
        cityTransitionLocked,
        mutationLocked: mutation.isPending || activationLockedRef.current,
        quantity,
        remainingAddable,
        variantId: variant.id,
      })
    ) {
      return;
    }
    activationLockedRef.current = true;
    mutation.mutate({
      productId: selection.product.id,
      quantity,
      variantId: variant.id,
    });
  };

  const productHref = `/products/${slug}`;
  const quantityReady =
    !selectionQuery.isFetching &&
    variant?.availability.status === "available" &&
    remainingAddable !== null &&
    remainingAddable > 0 &&
    contextMatches &&
    !cityTransitionLocked &&
    !mutation.isPending;
  const detailLink = (
    <Link
      href={productHref}
      className="type-body-sm font-medium text-gold-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={() => onOpenChange(false)}
    >
      {t("sheet.viewDetails")}
    </Link>
  );

  return (
    <RafalModal
      className="sm:max-w-lg"
      closeLabel={t("sheet.close")}
      onOpenChange={onOpenChange}
      open
      returnFocusRef={returnFocusRef}
      showClose
      title={selection?.product.name ?? productName}
    >
      {selectionQuery.isPending ? (
        <div
          aria-busy="true"
          className="min-h-80 rounded-md bg-gray-50 p-5 type-body text-gray-600 sm:min-h-96"
          role="status"
        >
          {t("sheet.loading")}
        </div>
      ) : selectionQuery.isError ? (
        <div className="min-h-80 space-y-4 sm:min-h-96">
          <p className="type-body text-destructive" role="status">
            {t(getReadErrorKey(selectionQuery.error))}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={() => void selectionQuery.refetch()}>
              {t("sheet.retry")}
            </Button>
            {detailLink}
          </div>
        </div>
      ) : selectionQuery.data.kind === "journey-changed" ? (
        <div className="min-h-80 space-y-4 sm:min-h-96">
          <p className="type-body text-gray-700" role="status">
            {t(
              selectionQuery.data.journey === "customize"
                ? "sheet.customizeChanged"
                : "sheet.directChanged",
            )}
          </p>
          {detailLink}
        </div>
      ) : selection ? (
        <div className="min-h-80 space-y-5 sm:min-h-96">
          <p className="type-body-sm text-gray-500">
            {t("sheet.city", { city: selection.city.name })}
          </p>

          <div className="space-y-4">
            {selection.product.options.map((option, optionIndex) => {
              const optionLabel = getVariantAttributeLabel(option.key, {
                color: t("sheet.options.color"),
                size: t("sheet.options.size"),
              });
              return (
                <fieldset key={option.id}>
                  <legend className="type-body font-medium text-gray-900">
                    {optionLabel}
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {option.values.map((value, valueIndex) => {
                      const selectable = isProductOptionValueAvailable(
                        selection.product.variants,
                        selectedOptions,
                        option.id,
                        value.id,
                      );
                      const selected = selectedOptions[option.id] === value.id;
                      const inputId = `${optionInputPrefix}-${optionIndex}-${valueIndex}`;
                      return (
                        <label
                          key={value.id}
                          className={cn(
                            "relative cursor-pointer",
                            !selectable && "cursor-not-allowed opacity-50",
                          )}
                          htmlFor={inputId}
                        >
                          <input
                            checked={selected}
                            className="peer sr-only"
                            disabled={!selectable}
                            id={inputId}
                            name={`${optionInputPrefix}-${option.id}`}
                            onChange={() => {
                              mutation.reset();
                              setQuantity(1);
                              setSelectedOptions((current) => ({
                                ...current,
                                [option.id]: value.id,
                              }));
                            }}
                            type="radio"
                            value={value.id}
                          />
                          <span className="flex min-h-11 items-center gap-2 rounded-md border border-gray-300 bg-gray-0 py-2 pe-10 ps-4 type-body-sm peer-checked:border-gold-600 peer-checked:bg-gold-50 peer-checked:ring-1 peer-checked:ring-gold-600 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
                            <VariantAttributeValue
                              attributeKey={option.key}
                              attributeValue={value.id}
                            />
                            {value.label}
                          </span>
                          <CheckIcon
                            aria-hidden="true"
                            className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gold-700 opacity-0 peer-checked:opacity-100"
                          />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>

          <div
            className="min-h-24 space-y-2 border-t border-gray-200 pt-4"
            data-quick-add-region="summary"
          >
            {variant ? (
              <>
              {(() => {
                const price = formatPrice(locale, variant);
                return (
                  <p className="flex min-h-8 flex-wrap items-baseline gap-2 tabular-nums">
                    <strong className="text-h3 text-gray-900">
                      <bdi>{price.current}</bdi>
                    </strong>
                    {price.compareAt ? (
                      <del className="type-body text-gray-400">
                        <bdi>{price.compareAt}</bdi>
                      </del>
                    ) : null}
                  </p>
                );
              })()}
              <p
                className={cn(
                  "type-body-sm font-medium",
                  variant.availability.status === "available" &&
                    remainingAddable !== 0
                    ? "text-success"
                    : "text-destructive",
                )}
                role="status"
              >
                {variant.availability.status === "available"
                  ? remainingAddable === 0
                    ? t("errors.quantityLimit")
                    : t("sheet.available")
                  : variant.availability.status === "out_of_stock"
                    ? t("errors.outOfStock")
                    : t("errors.unavailableAtLocation")}
              </p>
              </>
            ) : (
              <p className="type-body-sm text-gray-500" role="status">
                {t("sheet.completeSelection")}
              </p>
            )}
          </div>

          <div className="space-y-3 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between gap-4">
              <span className="type-body font-medium">{t("sheet.quantity")}</span>
              <div className="flex h-11 items-center rounded-md border border-gray-200">
                <button
                  aria-label={t("sheet.decrease")}
                  className="size-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-gray-300"
                  disabled={!quantityReady || quantity <= 1}
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  −
                </button>
                <output
                  aria-label={t("sheet.quantityValue", { quantity })}
                  className="min-w-8 text-center type-body font-medium"
                >
                  {quantity}
                </output>
                <button
                  aria-label={t("sheet.increase")}
                  className="size-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-gray-300"
                  disabled={
                    !quantityReady || quantity >= (remainingAddable ?? 0)
                  }
                  onClick={() =>
                    setQuantity((current) =>
                      Math.min(remainingAddable ?? current, current + 1),
                    )
                  }
                  type="button"
                >
                  +
                </button>
              </div>
            </div>
            <div
              className="min-h-5 type-caption text-gray-500"
              data-quick-add-region="quantity-helper"
            >
              {cartQuery.isPending ? (
                <p aria-busy="true" role="status">
                  {t("sheet.cartLoading")}
                </p>
              ) : cartQuery.isError ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-destructive" role="status">
                    {t("sheet.cartError")}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void cartQuery.refetch()}
                  >
                    {t("sheet.retry")}
                  </Button>
                </div>
              ) : remainingAddable !== null ? (
                <p>{t("sheet.remaining", { count: remainingAddable })}</p>
              ) : (
                <span aria-hidden="true">&nbsp;</span>
              )}
            </div>
            <Button
              className="w-full"
              data-quick-add-action="add"
              disabled={!canAdd}
              loading={mutation.isPending}
              loadingLabel={t("sheet.adding")}
              onClick={handleAdd}
              size="lg"
            >
              {t("sheet.addToCart")}
            </Button>
            {mutationError ? (
              <p
                className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 type-body-sm text-destructive"
                role="status"
              >
                {t(getAddErrorKey(mutationError))}
              </p>
            ) : null}
            <div>{detailLink}</div>
          </div>
        </div>
      ) : null}
    </RafalModal>
  );
}
