"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldFeedback } from "@/components/ui/field";
import { RafalModal } from "@/components/ui/rafal-modal";
import { updateCartGift } from "@/features/cart/actions/update-cart-gift";
import { beginRecommendationTransition } from "@/features/cart/api/cart-recommendation-lifecycle";
import {
  cartMutationKey,
  cartMutationScope,
} from "@/features/cart/api/cart-mutation";
import {
  currentCartQueryKeyRoot,
  setCurrentCartQueryData,
} from "@/features/cart/api/cart-query";
import {
  canonicalGiftRecipientDraft,
  GiftRecipientFields,
  giftRecipientDraft,
  type GiftRecipientDraft,
  type GiftRecipientDraftField,
  type GiftRecipientFieldsCopy,
  validateGiftRecipientDraft,
} from "@/features/cart/components/gift-recipient-fields";
import type {
  CartGiftError,
  CartSnapshot,
} from "@/features/cart/types/cart.types";

export type CheckoutGiftRecipientEditorCopy = {
  edit: string;
  title: string;
  close: string;
  save: string;
  saving: string;
  cancel: string;
  required: string;
  invalidPhone: string;
  validationError: string;
  sessionError: string;
  serviceError: string;
  fields: GiftRecipientFieldsCopy;
};

const backendFields: Readonly<Record<GiftRecipientDraftField, string>> = {
  name: "recipient.name",
  phone: "recipient.phone",
  city: "recipient.city_id",
  district: "recipient.district",
  streetDetails: "recipient.street_details",
};

function errorMessage(error: CartGiftError, copy: CheckoutGiftRecipientEditorCopy) {
  if (error.code === "validation-rejected" || error.code === "invalid-input") {
    return copy.validationError;
  }
  if (error.code === "unauthorized" || error.code === "cart-session-failure") {
    return copy.sessionError;
  }
  return copy.serviceError;
}

export function CheckoutGiftRecipientEditor({
  copy,
  disabled,
  gift,
  locale,
  onPendingChange,
  onPersisted,
}: {
  copy: CheckoutGiftRecipientEditorCopy;
  disabled: boolean;
  gift: CartSnapshot["gift"];
  locale: Locale;
  onPendingChange: (pending: boolean) => void;
  onPersisted: (gift: CartSnapshot["gift"]) => void;
}) {
  const queryClient = useQueryClient();
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<GiftRecipientDraft | null>(null);
  type ErrorKeys = Partial<Record<GiftRecipientDraftField, "required" | "invalidPhone" | "validationError">>;
  const [errorKeys, setFieldErrors] = useState<ErrorKeys>({});
  const fieldErrors = {
    name: errorKeys.name ? copy[errorKeys.name] : undefined,
    phone: errorKeys.phone ? copy[errorKeys.phone] : undefined,
    city: errorKeys.city ? copy[errorKeys.city] : undefined,
    district: errorKeys.district ? copy[errorKeys.district] : undefined,
    streetDetails: errorKeys.streetDetails ? copy[errorKeys.streetDetails] : undefined,
  };
  const [error, setError] = useState<CartGiftError | null>(null);
  const mutation = useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: (input: Parameters<typeof updateCartGift>[0]) =>
      updateCartGift(input, locale),
    retry: false,
    onMutate: () =>
      queryClient.cancelQueries({ queryKey: currentCartQueryKeyRoot }),
  });
  const recipient = gift.recipient;

  if (!recipient) return null;

  const updateDraft = <Field extends GiftRecipientDraftField>(
    field: Field,
    value: GiftRecipientDraft[Field],
  ) => {
    setDraft((current) =>
      current ? { ...current, [field]: value } : current,
    );
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || mutation.isPending || disabled) return;

    const nextErrors = validateGiftRecipientDraft(
      draft,
      "required",
      "invalidPhone",
    );
    setFieldErrors(nextErrors);
    const canonicalDraft = canonicalGiftRecipientDraft(draft);
    if (Object.keys(nextErrors).length > 0 || !canonicalDraft) return;

    setError(null);
    onPendingChange(true);
    const recommendationTransition = beginRecommendationTransition(queryClient);
    try {
      await recommendationTransition.ready;
      const result = await mutation.mutateAsync({
          kind: "recipient",
          giftWrap: gift.giftWrap,
          isAnonymous: gift.isAnonymous,
          message: gift.message,
          recipient: {
            name: canonicalDraft.name,
            phone: canonicalDraft.phone,
            cityId: canonicalDraft.city!.id,
            district: canonicalDraft.district,
            streetDetails: canonicalDraft.streetDetails,
          },
        });
      if (!result.ok) {
        setError(result.error);
        if (result.error.code === "validation-rejected") {
          const rejected: ErrorKeys = {};
          for (const field of Object.keys(
            backendFields,
          ) as GiftRecipientDraftField[]) {
            if (
              result.error.fields.includes(backendFields[field]) ||
              result.error.fields.includes("recipient")
            ) {
              rejected[field] = "validationError";
            }
          }
          setFieldErrors(rejected);
        }
        return;
      }

      if (!result.cart.gift.isGift || !result.cart.gift.recipient) {
        setError({ code: "service-unavailable" });
        return;
      }

      await queryClient.cancelQueries({ queryKey: currentCartQueryKeyRoot });
      setCurrentCartQueryData(queryClient, locale, result.cart);
      onPersisted(result.cart.gift);
      setOpen(false);
    } catch {
      setError({ code: "service-unavailable" });
    } finally {
      recommendationTransition.finish();
      onPendingChange(false);
    }
  };

  return (
    <>
      <Button
        ref={editButtonRef}
        type="button"
        variant="ghost"
        className="mt-4 px-0 text-gold-700"
        disabled={disabled}
        onClick={() => {
          setDraft(giftRecipientDraft(recipient));
          setFieldErrors({});
          setError(null);
          setOpen(true);
        }}
      >
        {copy.edit}
      </Button>
      <RafalModal
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setOpen(false);
        }}
        title={copy.title}
        closeLabel={copy.close}
        showClose
        dismissible={!mutation.isPending && !disabled}
        returnFocusRef={editButtonRef}
        className="sm:max-w-2xl"
      >
        {draft ? (
          <form className="pt-2" noValidate onSubmit={submit}>
            <fieldset disabled={mutation.isPending || disabled}>
              <GiftRecipientFields
                feedbackMessages={[copy.required, copy.validationError]}
                phoneFeedbackMessages={[copy.required, copy.invalidPhone, copy.validationError]}
                busy={mutation.isPending}
                copy={copy.fields}
                draft={draft}
                errors={fieldErrors}
                locale={locale}
                onChange={updateDraft}
              />
              <FieldFeedback role="alert" className="mt-4" reserve={[copy.validationError, copy.sessionError, copy.serviceError]}>
                {error ? errorMessage(error, copy) : null}
              </FieldFeedback>
              <div className="sticky bottom-0 -mx-6 mt-5 flex flex-wrap gap-3 border-t border-gray-200 bg-gray-0 px-6 pt-4 pb-[env(safe-area-inset-bottom)] sm:static sm:mx-0 sm:px-0 sm:pb-0">
                <Button
                  type="submit"
                  loading={mutation.isPending}
                  loadingLabel={copy.saving}
                >
                  {copy.save}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={mutation.isPending}
                  onClick={() => setOpen(false)}
                >
                  {copy.cancel}
                </Button>
              </div>
            </fieldset>
          </form>
        ) : null}
      </RafalModal>
    </>
  );
}
