"use client";

import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { updateCartGift } from "@/features/cart/actions/update-cart-gift";
import { syncAvailableCartCouponsAfterCartChange } from "@/features/cart/api/cart-coupons-query";
import {
  cartMutationFilters,
  cartMutationKey,
  cartMutationScope,
} from "@/features/cart/api/cart-mutation";
import { setCurrentCartQueryData } from "@/features/cart/api/cart-query";
import { CitySelectionDialog } from "@/features/location/components/CitySelectionDialog";
import { getCitiesClient } from "@/features/location/api/location-api.client";
import type {
  CartGiftError,
  CartGiftRecipient,
  CartGiftRecipientInput,
  CartSnapshot,
  UpdateCartGiftInput,
} from "@/features/cart/types/cart.types";
import type { City } from "@/features/location/types";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type CartGiftCopy = {
  title: string;
  description: string;
  giftWrap: string;
  giftWrapDescription: string;
  giftWrapUnavailable: string;
  sendAsGift: string;
  sendAsGiftDescription: string;
  updating: string;
  recipientTitle: string;
  name: string;
  phone: string;
  city: string;
  district: string;
  streetDetails: string;
  selectCity: string;
  changeCity: string;
  save: string;
  update: string;
  saving: string;
  cancel: string;
  required: string;
  validationError: string;
  serviceError: string;
  sessionError: string;
  cityDialog: {
    title: string;
    description: string;
    loading: string;
    empty: string;
    unavailable: string;
    close: string;
    searchLabel: string;
    searchPlaceholder: string;
    searchNoResults: string;
  };
};

type CartGiftProps = {
  copy: CartGiftCopy;
  gift: CartSnapshot["gift"];
  giftWrapEnabled: boolean;
  locale: Locale;
};

type RecipientDraft = {
  name: string;
  phone: string;
  city: Pick<City, "id" | "name"> | null;
  district: string;
  streetDetails: string;
};

type RecipientField = keyof RecipientDraft;
type RecipientErrors = Partial<Record<RecipientField, string>>;
type GiftAction = "wrap" | "gift" | "recipient";

type GiftMutationVariables = {
  action: GiftAction;
  input: UpdateCartGiftInput;
};

function recipientToDraft(recipient: CartGiftRecipient | null): RecipientDraft {
  return {
    name: recipient?.name ?? "",
    phone: recipient?.phone ?? "",
    city: recipient
      ? { id: recipient.city.id, name: recipient.city.name }
      : null,
    district: recipient?.district ?? "",
    streetDetails: recipient?.streetDetails ?? "",
  };
}

function validateRecipient(
  draft: RecipientDraft,
  requiredMessage: string,
): RecipientErrors {
  const errors: RecipientErrors = {};
  if (!draft.name.trim()) errors.name = requiredMessage;
  if (!draft.phone.trim()) errors.phone = requiredMessage;
  if (!draft.city) errors.city = requiredMessage;
  if (!draft.district.trim()) errors.district = requiredMessage;
  if (!draft.streetDetails.trim()) errors.streetDetails = requiredMessage;
  return errors;
}

function recipientInput(draft: RecipientDraft): CartGiftRecipientInput {
  return {
    name: draft.name.trim(),
    phone: draft.phone.trim(),
    cityId: draft.city!.id,
    district: draft.district.trim(),
    streetDetails: draft.streetDetails.trim(),
  };
}

function giftErrorMessage(error: CartGiftError, copy: CartGiftCopy) {
  if (error.code === "invalid-input" || error.code === "validation-rejected") {
    return copy.validationError;
  }
  if (error.code === "unauthorized" || error.code === "cart-session-failure") {
    return copy.sessionError;
  }
  return copy.serviceError;
}

function backendRecipientErrors(
  error: CartGiftError,
  message: string,
): RecipientErrors {
  if (error.code !== "validation-rejected") return {};

  const errors: RecipientErrors = {};
  for (const field of error.fields) {
    if (field === "recipient.name") errors.name = message;
    if (field === "recipient.phone") errors.phone = message;
    if (field === "recipient.city_id") errors.city = message;
    if (field === "recipient.district") errors.district = message;
    if (field === "recipient.street_details") errors.streetDetails = message;
  }
  return errors;
}

export function CartGift({
  copy,
  gift,
  giftWrapEnabled,
  locale,
}: CartGiftProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const cartMutationPending = useIsMutating(cartMutationFilters) > 0;
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState(() => recipientToDraft(gift.recipient));
  const [fieldErrors, setFieldErrors] = useState<RecipientErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [cityDialogOpen, setCityDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<GiftAction | null>(null);
  const nameId = useId();
  const phoneId = useId();
  const cityId = useId();
  const cityErrorId = useId();
  const districtId = useId();
  const streetDetailsId = useId();

  const citiesQuery = useQuery({
    queryKey: ["location", "cities", locale],
    queryFn: () => getCitiesClient(locale),
    enabled: cityDialogOpen,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const giftMutation = useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: ({ input }: GiftMutationVariables) =>
      updateCartGift(input, locale),
    retry: false,
    onSuccess: (result, variables) => {
      if (result.ok) {
        setCurrentCartQueryData(queryClient, locale, result.cart);
        void syncAvailableCartCouponsAfterCartChange(
          queryClient,
          locale,
          result.cart,
        );
        if (variables.action === "recipient") {
          setDraft(recipientToDraft(result.cart.gift.recipient));
          setDraftOpen(false);
          setFieldErrors({});
        } else if (variables.action === "gift") {
          setDraftOpen(false);
        }
        setError(null);
        return;
      }

      setFieldErrors(backendRecipientErrors(result.error, copy.required));
      setError(giftErrorMessage(result.error, copy));
      if (result.error.code === "unauthorized") router.refresh();
    },
    onError: () => setError(copy.serviceError),
    onSettled: () => setPendingAction(null),
  });

  const busy = cartMutationPending;
  const showRecipient = gift.isGift || draftOpen;

  const startMutation = (action: GiftAction, input: UpdateCartGiftInput) => {
    if (busy) return;
    setError(null);
    setPendingAction(action);
    giftMutation.mutate({ action, input });
  };

  const cancelDraft = () => {
    setDraft(recipientToDraft(gift.recipient));
    setDraftOpen(false);
    setFieldErrors({});
    setError(null);
  };

  const submitRecipient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    const nextErrors = validateRecipient(draft, copy.required);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError(copy.validationError);
      return;
    }

    startMutation("recipient", {
      ...(!gift.isGift ? { isGift: true } : {}),
      recipient: recipientInput(draft),
    });
  };

  const updateDraft = <Field extends Exclude<RecipientField, "city">>(
    field: Field,
    value: RecipientDraft[Field],
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <section
      aria-labelledby="cart-gift-title"
      className="mt-6 rounded-lg border border-gray-200 bg-gray-0 p-4 sm:p-5"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <h2 id="cart-gift-title" className="text-h3 font-bold text-gray-1000">
        {copy.title}
      </h2>
      <p className="mt-1 type-body-sm text-gray-500">{copy.description}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="flex min-h-24 items-center justify-between gap-4 rounded-md border border-gray-200 p-4">
          <div>
            <label
              htmlFor="cart-gift-wrap"
              className="type-body font-medium text-gray-1000"
            >
              {copy.giftWrap}
            </label>
            <p className="mt-1 type-caption text-gray-500">
              {giftWrapEnabled
                ? copy.giftWrapDescription
                : copy.giftWrapUnavailable}
            </p>
          </div>
          <Switch
            id="cart-gift-wrap"
            checked={gift.giftWrap}
            disabled={!giftWrapEnabled || busy}
            aria-busy={
              giftMutation.isPending && pendingAction === "wrap"
                ? true
                : undefined
            }
            onCheckedChange={(checked) =>
              startMutation("wrap", { giftWrap: checked })
            }
          />
        </div>

        <div className="flex min-h-24 items-center justify-between gap-4 rounded-md border border-gray-200 p-4">
          <div>
            <label
              htmlFor="cart-send-as-gift"
              className="type-body font-medium text-gray-1000"
            >
              {copy.sendAsGift}
            </label>
            <p className="mt-1 type-caption text-gray-500">
              {copy.sendAsGiftDescription}
            </p>
          </div>
          <Switch
            id="cart-send-as-gift"
            checked={gift.isGift || draftOpen}
            disabled={busy}
            aria-busy={
              giftMutation.isPending && pendingAction === "gift"
                ? true
                : undefined
            }
            onCheckedChange={(checked) => {
              if (checked) {
                setDraft(recipientToDraft(gift.recipient));
                setDraftOpen(true);
                setFieldErrors({});
                setError(null);
              } else if (gift.isGift) {
                startMutation("gift", { isGift: false });
              } else {
                cancelDraft();
              }
            }}
          />
        </div>
      </div>

      <p aria-live="polite" className="mt-2 min-h-4 type-caption text-gray-500">
        {giftMutation.isPending && pendingAction !== "recipient"
          ? copy.updating
          : ""}
      </p>

      {showRecipient ? (
        <form
          className="mt-4 border-t border-gray-200 pt-5"
          noValidate
          onSubmit={submitRecipient}
        >
          <fieldset disabled={busy}>
            <legend className="text-h4 font-medium text-gray-1000">
              {copy.recipientTitle}
            </legend>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <InputField
                id={nameId}
                name="giftRecipientName"
                label={copy.name}
                value={draft.name}
                error={fieldErrors.name}
                autoComplete="name"
                required
                onChange={(event) => updateDraft("name", event.target.value)}
              />
              <InputField
                id={phoneId}
                name="giftRecipientPhone"
                type="tel"
                inputMode="tel"
                label={copy.phone}
                value={draft.phone}
                error={fieldErrors.phone}
                autoComplete="tel"
                required
                dir="ltr"
                onChange={(event) => updateDraft("phone", event.target.value)}
              />
              <div className="flex w-full flex-col gap-1.5">
                <label
                  htmlFor={cityId}
                  className={cn(
                    "type-label text-gray-600",
                    fieldErrors.city && "text-destructive",
                  )}
                >
                  {copy.city}
                </label>
                <button
                  id={cityId}
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={cityDialogOpen}
                  aria-describedby={fieldErrors.city ? cityErrorId : undefined}
                  aria-label={
                    draft.city
                      ? `${copy.changeCity}: ${draft.city.name}`
                      : copy.selectCity
                  }
                  className={cn(
                    "flex h-11 w-full items-center rounded-md border border-gray-200 bg-gray-0 px-3.5 text-start type-body text-gray-1000 outline-none",
                    "focus-visible:border-[length:var(--border-width-emphasis)] focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-ring",
                    fieldErrors.city && "border-destructive",
                  )}
                  onClick={() => setCityDialogOpen(true)}
                >
                  {draft.city?.name ?? copy.selectCity}
                </button>
                {fieldErrors.city ? (
                  <p id={cityErrorId} className="type-caption text-destructive">
                    {fieldErrors.city}
                  </p>
                ) : null}
              </div>
              <InputField
                id={districtId}
                name="giftRecipientDistrict"
                label={copy.district}
                value={draft.district}
                error={fieldErrors.district}
                autoComplete="address-level3"
                required
                onChange={(event) =>
                  updateDraft("district", event.target.value)
                }
              />
              <div className="sm:col-span-2">
                <InputField
                  id={streetDetailsId}
                  name="giftRecipientStreetDetails"
                  label={copy.streetDetails}
                  value={draft.streetDetails}
                  error={fieldErrors.streetDetails}
                  autoComplete="street-address"
                  required
                  onChange={(event) =>
                    updateDraft("streetDetails", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                type="submit"
                loading={
                  giftMutation.isPending && pendingAction === "recipient"
                }
                loadingLabel={copy.saving}
                disabled={busy}
              >
                {gift.isGift ? copy.update : copy.save}
              </Button>
              {!gift.isGift ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={cancelDraft}
                >
                  {copy.cancel}
                </Button>
              ) : null}
            </div>
          </fieldset>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 type-body-sm text-destructive">
          {error}
        </p>
      ) : null}

      {cityDialogOpen ? (
        <CitySelectionDialog
          cities={citiesQuery.data ?? []}
          copy={{
            title: copy.cityDialog.title,
            description: copy.cityDialog.description,
            loading: copy.cityDialog.loading,
            empty: citiesQuery.isError
              ? copy.cityDialog.unavailable
              : copy.cityDialog.empty,
            close: copy.cityDialog.close,
            searchLabel: copy.cityDialog.searchLabel,
            searchPlaceholder: copy.cityDialog.searchPlaceholder,
            searchNoResults: copy.cityDialog.searchNoResults,
          }}
          isLoading={citiesQuery.isPending}
          isOpen
          selectedCityId={draft.city?.id}
          onClose={() => setCityDialogOpen(false)}
          onSelect={(city) => {
            setDraft((current) => ({ ...current, city }));
            setFieldErrors((current) => ({ ...current, city: undefined }));
            setCityDialogOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}
