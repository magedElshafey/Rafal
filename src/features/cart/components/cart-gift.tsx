"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Locale, useTranslations } from "next-intl";
import { type FormEvent, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { CityPickerDialog } from "@/components/ui/city-picker-dialog";
import { InputField } from "@/components/ui/input";
import { SaudiMobileField } from "@/components/ui/saudi-mobile-field";
import { Switch } from "@/components/ui/switch";
import { updateCartGift } from "@/features/cart/actions/update-cart-gift";
import {
  cartMutationKey,
  cartMutationScope,
} from "@/features/cart/api/cart-mutation";
import {
  currentCartQueryKeyRoot,
  setCurrentCartQueryData,
} from "@/features/cart/api/cart-query";
import type {
  CartGiftError,
  CartSnapshot,
  UpdateCartGiftInput,
} from "@/features/cart/types/cart.types";
import { cityCatalogQueryOptions } from "@/features/location/api/city-query";
import {
  formatSaudiMobileForDisplay,
  formatSaudiMobileForInput,
  isValidSaudiMobile,
  normalizeSaudiMobile,
} from "@/lib/phone/saudi-mobile";

type GiftDraft = {
  name: string;
  phone: string;
  city: { id: number; name: string } | null;
  district: string;
  streetDetails: string;
  message: string;
  isAnonymous: boolean;
};

type GiftEditingMode = "new" | "existing";
type GiftDraftField = keyof GiftDraft;
type GiftDraftErrors = Partial<Record<GiftDraftField, string>>;

const recipientFields = ["name", "phone", "district", "streetDetails"] as const;
const backendFields: Record<GiftDraftField, string> = {
  name: "recipient.name",
  phone: "recipient.phone",
  city: "recipient.city_id",
  district: "recipient.district",
  streetDetails: "recipient.street_details",
  message: "gift_message",
  isAnonymous: "is_anonymous",
};

function emptyGiftDraft(): GiftDraft {
  return {
    name: "",
    phone: "",
    city: null,
    district: "",
    streetDetails: "",
    message: "",
    isAnonymous: false,
  };
}

function persistedGiftDraft(gift: CartSnapshot["gift"]): GiftDraft {
  const { recipient } = gift;
  return {
    name: recipient?.name ?? "",
    phone: recipient ? formatSaudiMobileForInput(recipient.phone) : "",
    city: recipient?.city ?? null,
    district: recipient?.district ?? "",
    streetDetails: recipient?.streetDetails ?? "",
    message: gift.message ?? "",
    isAnonymous: gift.isAnonymous,
  };
}

function GiftSummary({
  gift,
  busy,
  onEdit,
}: {
  gift: CartSnapshot["gift"];
  busy: boolean;
  onEdit: () => void;
}) {
  const t = useTranslations("Common.cartPage.gift");
  const id = useId();
  const { recipient } = gift;

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="mt-5 rounded-md border border-gray-200 bg-gray-50 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 id={`${id}-title`} className="type-body font-bold text-gray-1000">
            {t("savedTitle")}
          </h3>
          {recipient ? (
            <dl className="mt-3 grid gap-x-6 gap-y-3 type-body-sm text-gray-600 sm:grid-cols-2">
              <div>
                <dt className="type-caption text-gray-500">{t("name")}</dt>
                <dd className="mt-0.5 text-gray-1000">{recipient.name}</dd>
              </div>
              <div>
                <dt className="type-caption text-gray-500">{t("phone")}</dt>
                <dd className="mt-0.5 text-gray-1000">
                  <bdi dir="ltr">
                    {formatSaudiMobileForDisplay(recipient.phone)}
                  </bdi>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="type-caption text-gray-500">{t("savedAddress")}</dt>
                <dd className="mt-0.5 text-gray-1000">
                  {[recipient.city.name, recipient.district, recipient.streetDetails].join(`${t("addressSeparator")} `)}
                </dd>
              </div>
              {gift.message ? (
                <div className="sm:col-span-2">
                  <dt className="type-caption text-gray-500">{t("message")}</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-gray-1000">{gift.message}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {gift.isAnonymous ? (
            <p className="mt-3 type-caption text-gray-600">{t("anonymousSummary")}</p>
          ) : null}
        </div>
        <Button size="sm" variant="outline" disabled={busy} onClick={onEdit}>
          {t("edit")}
        </Button>
      </div>
    </section>
  );
}

function GiftEditor({
  initialDraft,
  locale,
  busy,
  onCancel,
  onSave,
}: {
  initialDraft: GiftDraft;
  locale: Locale;
  busy: boolean;
  onCancel: () => void;
  onSave: (draft: GiftDraft) => Promise<CartGiftError | null>;
}) {
  const t = useTranslations("Common.cartPage.gift");
  const id = useId();
  const [draft, setDraft] = useState(initialDraft);
  const [cityOpen, setCityOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<GiftDraftErrors>({});
  const cities = useQuery({
    ...cityCatalogQueryOptions(locale),
    enabled: cityOpen,
  });

  const updateDraft = <Field extends GiftDraftField>(
    field: Field,
    value: GiftDraft[Field],
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    const nextErrors: GiftDraftErrors = {};
    for (const field of recipientFields) {
      if (!draft[field].trim()) nextErrors[field] = t("required");
    }
    if (draft.phone.trim() && !isValidSaudiMobile(draft.phone)) {
      nextErrors.phone = t("invalidField");
    }
    if (!draft.city) nextErrors.city = t("required");
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !draft.city) return;

    const failure = await onSave({
      ...draft,
      name: draft.name.trim(),
      phone: normalizeSaudiMobile(draft.phone)!,
      district: draft.district.trim(),
      streetDetails: draft.streetDetails.trim(),
      message: draft.message.trim(),
    });
    if (failure?.code !== "validation-rejected") return;

    const rejectedFields: GiftDraftErrors = {};
    for (const field of Object.keys(backendFields) as GiftDraftField[]) {
      if (
        failure.fields.includes(backendFields[field]) ||
        (failure.fields.includes("recipient") && backendFields[field].startsWith("recipient."))
      ) {
        rejectedFields[field] = t("invalidField");
      }
    }
    setFieldErrors(rejectedFields);
  };

  return (
    <form className="mt-5 border-t border-gray-200 pt-5" noValidate onSubmit={handleSubmit}>
      <fieldset disabled={busy}>
        <legend className="text-h4 font-bold text-gray-1000">{t("recipientTitle")}</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {recipientFields.map((field) =>
            field === "phone" ? (
              <SaudiMobileField
                key={field}
                id={`${id}-${field}`}
                name={field}
                label={t(field)}
                required
                value={draft.phone}
                error={fieldErrors.phone}
                onChange={(event) => updateDraft("phone", event.target.value)}
              />
            ) : (
              <InputField
                key={field}
                id={`${id}-${field}`}
                name={field}
                label={t(field)}
                type="text"
                autoComplete="off"
                required
                value={draft[field]}
                error={fieldErrors[field]}
                onChange={(event) => updateDraft(field, event.target.value)}
              />
            ),
          )}

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor={`${id}-city`} className="type-label text-gray-600">
              {t("city")}
            </label>
            <Button
              id={`${id}-city`}
              type="button"
              variant="outline"
              aria-haspopup="dialog"
              aria-expanded={cityOpen}
              aria-invalid={Boolean(fieldErrors.city) || undefined}
              aria-describedby={fieldErrors.city ? `${id}-city-error` : undefined}
              className="w-full justify-start border border-gray-200 bg-gray-0 font-normal"
              onClick={() => setCityOpen(true)}
            >
              {draft.city?.name ?? t("selectCity")}
            </Button>
            {fieldErrors.city ? (
              <p id={`${id}-city-error`} className="type-caption text-destructive">
                {fieldErrors.city}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <InputField
              id={`${id}-message`}
              name="giftMessage"
              label={t("message")}
              autoComplete="off"
              value={draft.message}
              error={fieldErrors.message}
              onChange={(event) => updateDraft("message", event.target.value)}
            />
          </div>

          <div className="rounded-md border border-gray-200 p-4 sm:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <label htmlFor={`${id}-anonymous`} className="type-body font-medium text-gray-1000">
                  {t("isAnonymous")}
                </label>
                <p className="mt-0.5 type-caption text-gray-500">{t("anonymousDescription")}</p>
              </div>
              <Switch
                id={`${id}-anonymous`}
                checked={draft.isAnonymous}
                aria-invalid={Boolean(fieldErrors.isAnonymous) || undefined}
                aria-describedby={fieldErrors.isAnonymous ? `${id}-anonymous-error` : undefined}
                onCheckedChange={(isAnonymous) => updateDraft("isAnonymous", isAnonymous)}
              />
            </div>
            {fieldErrors.isAnonymous ? (
              <p id={`${id}-anonymous-error`} className="mt-1.5 type-caption text-destructive">
                {fieldErrors.isAnonymous}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="submit" loading={busy} loadingLabel={t("saving")}>
            {t("save")}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
        </div>
      </fieldset>

      {cityOpen ? (
        <CityPickerDialog
          cities={cities.data ?? []}
          copy={{
            title: t("cityDialog.title"),
            description: t("cityDialog.description"),
            loading: t("cityDialog.loading"),
            empty: cities.isError ? t("cityDialog.unavailable") : t("cityDialog.empty"),
            close: t("cityDialog.close"),
            searchLabel: t("cityDialog.searchLabel"),
            searchPlaceholder: t("cityDialog.searchPlaceholder"),
            searchNoResults: t("cityDialog.searchNoResults"),
          }}
          isOpen
          isLoading={cities.isPending}
          selectedCityId={draft.city?.id}
          onClose={() => setCityOpen(false)}
          onSelect={(city) => {
            updateDraft("city", city);
            setCityOpen(false);
          }}
        />
      ) : null}
    </form>
  );
}

export function CartGift({
  gift,
  locale,
}: {
  gift: CartSnapshot["gift"];
  locale: Locale;
}) {
  const t = useTranslations("Common.cartPage.gift");
  const id = useId();
  const queryClient = useQueryClient();
  const mutationInFlight = useRef(false);
  const [editing, setEditing] = useState<GiftEditingMode | null>(null);
  const [error, setError] = useState<CartGiftError | null>(null);

  const mutation = useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: (input: UpdateCartGiftInput) => updateCartGift(input, locale),
    retry: false,
    onMutate: () => queryClient.cancelQueries({ queryKey: currentCartQueryKeyRoot }),
  });

  const runMutation = async (input: UpdateCartGiftInput): Promise<CartGiftError | null> => {
    if (mutationInFlight.current) return null;
    mutationInFlight.current = true;
    setError(null);
    try {
      const result = await mutation.mutateAsync(input);
      if (!result.ok) {
        setError(result.error);
        return result.error;
      }

      // Stop any focus-triggered read that started while the PUT was pending.
      await queryClient.cancelQueries({ queryKey: currentCartQueryKeyRoot });
      setCurrentCartQueryData(queryClient, locale, result.cart);
      setEditing(null);
      return null;
    } catch {
      const failure: CartGiftError = { code: "service-unavailable" };
      setError(failure);
      return failure;
    } finally {
      mutationInFlight.current = false;
    }
  };

  const checked = gift.isGift || editing === "new";
  const busy = mutation.isPending;

  return (
    <section
      aria-labelledby={`${id}-title`}
      aria-busy={busy}
      className="mt-6 rounded-lg border border-gray-200 bg-gray-0 p-4 sm:p-5"
    >
      <h2 id={`${id}-title`} className="text-h3 font-bold text-gray-1000">
        {t("title")}
      </h2>
      <p id={`${id}-description`} className="mt-1 type-body-sm text-gray-500">
        {t("description")}
      </p>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-md border border-gray-200 p-4">
        <label htmlFor={`${id}-gift`} className="type-body font-medium text-gray-1000">
          {t("sendAsGift")}
        </label>
        <Switch
          id={`${id}-gift`}
          checked={checked}
          disabled={busy}
          aria-describedby={`${id}-description`}
          onCheckedChange={(enabled) => {
            if (enabled) {
              setError(null);
              setEditing("new");
              return;
            }
            if (gift.isGift) {
              void runMutation({ kind: "disable-gift", giftWrap: gift.giftWrap });
              return;
            }
            setEditing(null);
            setError(null);
          }}
        />
      </div>

      <p aria-live="polite" className="mt-2 min-h-5 type-caption text-gray-500">
        {busy ? t("updating") : ""}
      </p>

      {gift.isGift && editing === null ? (
        <GiftSummary
          gift={gift}
          busy={busy}
          onEdit={() => {
            setError(null);
            setEditing("existing");
          }}
        />
      ) : null}

      {editing ? (
        <GiftEditor
          key={editing}
          initialDraft={editing === "new" ? emptyGiftDraft() : persistedGiftDraft(gift)}
          locale={locale}
          busy={busy}
          onCancel={() => {
            setEditing(null);
            setError(null);
          }}
          onSave={(draft) => runMutation({
            kind: "recipient",
            giftWrap: gift.giftWrap,
            isAnonymous: draft.isAnonymous,
            message: draft.message || null,
            recipient: {
              name: draft.name,
              phone: draft.phone,
              cityId: draft.city!.id,
              district: draft.district,
              streetDetails: draft.streetDetails,
            },
          })}
        />
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 type-body-sm text-destructive">
          {error.code === "validation-rejected" || error.code === "invalid-input"
            ? t("validationError")
            : error.code === "unauthorized" || error.code === "cart-session-failure"
              ? t("sessionError")
              : t("serviceError")}
        </p>
      ) : null}
    </section>
  );
}
