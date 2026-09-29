"use client";

import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Locale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { CityPickerDialog } from "@/components/ui/city-picker-dialog";
import { InputField } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { updateCartGift } from "@/features/cart/actions/update-cart-gift";
import { syncAvailableCartCouponsAfterCartChange } from "@/features/cart/api/cart-coupons-query";
import { cartMutationFilters, cartMutationKey, cartMutationScope } from "@/features/cart/api/cart-mutation";
import { currentCartQueryKeyRoot, setCurrentCartQueryData } from "@/features/cart/api/cart-query";
import type { CartGiftError, CartSnapshot, UpdateCartGiftInput } from "@/features/cart/types/cart.types";
import { cityCatalogQueryOptions } from "@/features/location/api/city-query";

type GiftDraft = {
  name: string;
  phone: string;
  city: { id: number; name: string } | null;
  district: string;
  streetDetails: string;
  message: string;
  isAnonymous: boolean;
};

const recipientFields = ["name", "phone", "district", "streetDetails"] as const;
const backendFields = {
  name: "recipient.name",
  phone: "recipient.phone",
  city: "recipient.city_id",
  district: "recipient.district",
  streetDetails: "recipient.street_details",
  message: "gift_message",
  isAnonymous: "is_anonymous",
} as const;

function giftDraft(gift: CartSnapshot["gift"]): GiftDraft {
  const { recipient } = gift;
  return {
    name: recipient?.name ?? "",
    phone: recipient?.phone ?? "",
    city: recipient?.city ?? null,
    district: recipient?.district ?? "",
    streetDetails: recipient?.streetDetails ?? "",
    message: gift.message ?? "",
    isAnonymous: gift.isAnonymous,
  };
}

export function CartGift({ gift, locale }: {
  gift: CartSnapshot["gift"];
  locale: Locale;
}) {
  const t = useTranslations("Common.cartPage.gift");
  const id = useId();
  const queryClient = useQueryClient();
  const cartMutationPending = useIsMutating(cartMutationFilters) > 0;
  const [draft, setDraft] = useState<GiftDraft | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [error, setError] = useState<CartGiftError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof GiftDraft, string>>>({});
  const cities = useQuery({ ...cityCatalogQueryOptions(locale), enabled: cityOpen });

  const mutation = useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: (input: UpdateCartGiftInput) => updateCartGift(input, locale),
    retry: false,
    onMutate: () => queryClient.cancelQueries({ queryKey: currentCartQueryKeyRoot }),
    onSuccess: async (result, input) => {
      if (result.ok) {
        // Also cancel any focus-triggered read started while the PUT was pending.
        await queryClient.cancelQueries({ queryKey: currentCartQueryKeyRoot });
        setCurrentCartQueryData(queryClient, locale, result.cart);
        void syncAvailableCartCouponsAfterCartChange(queryClient, locale, result.cart);
        if (input.kind !== "wrap") {
          setDraft(null);
          setFieldErrors({});
        }
        setError(null);
      } else {
        setError(result.error);
        if (result.error.code === "validation-rejected") {
          const fields = result.error.fields;
          const nextErrors: Partial<Record<keyof GiftDraft, string>> = {};
          for (const field of Object.keys(backendFields) as (keyof GiftDraft)[]) {
            if (
              fields.includes(backendFields[field]) ||
              (fields.includes("recipient") && backendFields[field].startsWith("recipient."))
            ) {
              nextErrors[field] = t("invalidField");
            }
          }
          setFieldErrors(nextErrors);
        }
      }
    },
    onError: () => setError({ code: "service-unavailable" }),
  });

  const busy = cartMutationPending || mutation.isPending;
  const submit = (input: UpdateCartGiftInput) => {
    if (busy || queryClient.isMutating(cartMutationFilters) > 0) return;
    setError(null);
    mutation.mutate(input);
  };
  const openRecipient = () => {
    setDraft(giftDraft(gift));
    setFieldErrors({});
    setError(null);
  };
  const saveRecipient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || busy) return;
    const nextErrors: Partial<Record<keyof GiftDraft, string>> = {};
    for (const field of recipientFields) {
      if (!draft[field].trim()) nextErrors[field] = t("required");
    }
    if (!draft.city) nextErrors.city = t("required");
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !draft.city) return;
    submit({
      kind: "recipient",
      isAnonymous: draft.isAnonymous,
      message: draft.message.trim() ? draft.message : null,
      recipient: {
        name: draft.name, phone: draft.phone, cityId: draft.city.id,
        district: draft.district, streetDetails: draft.streetDetails,
      },
    });
  };

  return (
    <section aria-labelledby={`${id}-title`} className="mt-6 rounded-lg border border-gray-200 bg-gray-0 p-4 sm:p-5">
      <h2 id={`${id}-title`} className="text-h3 font-bold text-gray-1000">{t("title")}</h2>
      <p className="mt-1 type-body-sm text-gray-500">{t("description")}</p>
      <div className="mt-5">
        <div className="flex items-center justify-between gap-4 rounded-md border border-gray-200 p-4">
          <label htmlFor={`${id}-gift`} className="type-body font-medium">{t("sendAsGift")}</label>
          <Switch
            id={`${id}-gift`}
            checked={gift.isGift || draft !== null}
            disabled={busy}
            onCheckedChange={(enabled) => {
              if (enabled) openRecipient();
              else if (gift.isGift) submit({ kind: "disable-gift" });
              else { setDraft(null); setFieldErrors({}); setError(null); }
            }}
          />
        </div>
      </div>
      <p role="status" className="mt-2 type-caption text-gray-500">{mutation.isPending ? t("updating") : ""}</p>
      {gift.isGift && !draft ? (
        <div className="mt-4 space-y-3">
          {gift.recipient ? (
            <p className="type-body text-gray-600">
              {gift.recipient.name} · <bdi>{gift.recipient.phone}</bdi><br />
              {gift.recipient.city.name}، {gift.recipient.district}، {gift.recipient.streetDetails}
            </p>
          ) : null}
          <Button variant="outline" disabled={busy} onClick={openRecipient}>{t("edit")}</Button>
        </div>
      ) : null}
      {draft ? (
        <form className="mt-4 border-t border-gray-200 pt-5" noValidate onSubmit={saveRecipient}>
          <fieldset disabled={busy}>
            <legend className="text-h4 text-gray-1000">{t("recipientTitle")}</legend>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {recipientFields.map((field) => (
                <InputField
                  key={field}
                  id={`${id}-${field}`}
                  name={field}
                  label={t(field)}
                  type={field === "phone" ? "tel" : "text"}
                  dir={field === "phone" ? "ltr" : undefined}
                  autoComplete="off"
                  required
                  value={draft[field]}
                  error={fieldErrors[field]}
                  onChange={(event) => {
                    setDraft({ ...draft, [field]: event.target.value });
                    setFieldErrors((current) => ({ ...current, [field]: undefined }));
                  }}
                />
              ))}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor={`${id}-city`} className="type-label text-gray-600">{t("city")}</label>
                <Button
                  id={`${id}-city`}
                  type="button"
                  variant="outline"
                  aria-haspopup="dialog"
                  aria-expanded={cityOpen}
                  aria-invalid={Boolean(fieldErrors.city) || undefined}
                  aria-describedby={fieldErrors.city ? `${id}-city-error` : undefined}
                  onClick={() => setCityOpen(true)}
                >{draft.city?.name ?? t("selectCity")}</Button>
                {fieldErrors.city ? <p id={`${id}-city-error`} className="type-caption text-destructive">{fieldErrors.city}</p> : null}
              </div>
              <div className="sm:col-span-2">
                <InputField
                  id={`${id}-message`}
                  name="giftMessage"
                  label={t("message")}
                  value={draft.message}
                  error={fieldErrors.message}
                  onChange={(event) => {
                    setDraft({ ...draft, message: event.target.value });
                    setFieldErrors((current) => ({ ...current, message: undefined }));
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor={`${id}-anonymous`} className="type-body text-gray-600">{t("isAnonymous")}</label>
                  <Switch
                    id={`${id}-anonymous`}
                    checked={draft.isAnonymous}
                    disabled={busy}
                    aria-invalid={Boolean(fieldErrors.isAnonymous) || undefined}
                    aria-describedby={fieldErrors.isAnonymous ? `${id}-anonymous-error` : undefined}
                    onCheckedChange={(isAnonymous) => {
                      setDraft({ ...draft, isAnonymous });
                      setFieldErrors((current) => ({ ...current, isAnonymous: undefined }));
                    }}
                  />
                </div>
                {fieldErrors.isAnonymous ? <p id={`${id}-anonymous-error`} className="mt-1.5 type-caption text-destructive">{fieldErrors.isAnonymous}</p> : null}
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <Button type="submit" loading={mutation.isPending && mutation.variables?.kind === "recipient"} loadingLabel={t("saving")} disabled={busy}>{t("save")}</Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => { setDraft(null); setFieldErrors({}); setError(null); }}>{t("cancel")}</Button>
            </div>
          </fieldset>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 type-body-sm text-destructive">
          {error.code === "validation-rejected" || error.code === "invalid-input"
            ? t("validationError")
            : error.code === "unauthorized" || error.code === "cart-session-failure"
              ? t("sessionError") : t("serviceError")}
        </p>
      ) : null}
      {cityOpen && draft ? (
        <CityPickerDialog
          cities={cities.data ?? []}
          copy={{
            title: t("cityDialog.title"), description: t("cityDialog.description"),
            loading: t("cityDialog.loading"), empty: cities.isError ? t("cityDialog.unavailable") : t("cityDialog.empty"),
            close: t("cityDialog.close"), searchLabel: t("cityDialog.searchLabel"),
            searchPlaceholder: t("cityDialog.searchPlaceholder"), searchNoResults: t("cityDialog.searchNoResults"),
          }}
          isOpen
          isLoading={cities.isPending}
          selectedCityId={draft.city?.id}
          onClose={() => setCityOpen(false)}
          onSelect={(city) => {
            setDraft({ ...draft, city });
            setFieldErrors((current) => ({ ...current, city: undefined }));
            setCityOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}
