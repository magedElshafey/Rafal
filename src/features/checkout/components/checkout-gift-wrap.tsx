"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { type FormEvent, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import type { CheckoutGiftWrapConfig } from "@/features/checkout/types/checkout.types";

export type CheckoutGiftWrapCopy = {
  title: string;
  description: string;
  messageLabel: string;
  saveMessage: string;
  savingMessage: string;
  updating: string;
  unsaved: string;
  validationError: string;
  sessionError: string;
  serviceError: string;
};

function formatMoney(locale: Locale, amount: number, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

function giftUpdateInput(
  gift: CartSnapshot["gift"],
  giftWrap: boolean,
  message: string | null,
): UpdateCartGiftInput | null {
  if (!gift.isGift) {
    return {
      kind: "disable-gift",
      giftWrap,
      isAnonymous: gift.isAnonymous,
      message,
    };
  }

  const recipient = gift.recipient;
  if (!recipient) return null;

  return {
    kind: "recipient",
    giftWrap,
    isAnonymous: gift.isAnonymous,
    message,
    recipient: {
      name: recipient.name,
      phone: recipient.phone,
      cityId: recipient.city.id,
      district: recipient.district,
      streetDetails: recipient.streetDetails,
    },
  };
}

function errorMessage(error: CartGiftError, copy: CheckoutGiftWrapCopy) {
  if (error.code === "validation-rejected" || error.code === "invalid-input") {
    return copy.validationError;
  }
  if (error.code === "unauthorized" || error.code === "cart-session-failure") {
    return copy.sessionError;
  }
  return copy.serviceError;
}

export function CheckoutGiftWrap({
  config,
  copy,
  disabled,
  gift,
  locale,
  onMessageDirtyChange,
  onPendingChange,
  onPersisted,
}: {
  config: CheckoutGiftWrapConfig | null;
  copy: CheckoutGiftWrapCopy;
  disabled: boolean;
  gift: CartSnapshot["gift"];
  locale: Locale;
  onMessageDirtyChange: (dirty: boolean) => void;
  onPendingChange: (pending: boolean) => void;
  onPersisted: (
    gift: CartSnapshot["gift"],
    refreshQuote: boolean,
  ) => Promise<void>;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const mutationInFlight = useRef(false);
  const persistedMessage = gift.message ?? "";
  const [messageDraft, setMessageDraft] = useState(persistedMessage);
  const [error, setError] = useState<CartGiftError | null>(null);
  const mutation = useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: (input: UpdateCartGiftInput) => updateCartGift(input, locale),
    retry: false,
    onMutate: () =>
      queryClient.cancelQueries({ queryKey: currentCartQueryKeyRoot }),
  });
  const showMessageEditor = gift.giftWrap && gift.isGift;
  const messageDirty = showMessageEditor && messageDraft !== persistedMessage;
  const busy = disabled || mutation.isPending;
  const visible = config?.enabled === true || gift.giftWrap;

  if (!visible) return null;

  const persist = async (
    input: UpdateCartGiftInput | null,
    refreshQuote: boolean,
  ) => {
    if (!input || disabled || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setError(null);
    onPendingChange(true);
    try {
      const result = await mutation.mutateAsync(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      await queryClient.cancelQueries({ queryKey: currentCartQueryKeyRoot });
      setCurrentCartQueryData(queryClient, locale, result.cart);
      setMessageDraft(result.cart.gift.message ?? "");
      onMessageDirtyChange(false);
      await onPersisted(result.cart.gift, refreshQuote);
    } catch {
      setError({ code: "service-unavailable" });
    } finally {
      mutationInFlight.current = false;
      onPendingChange(false);
    }
  };

  const saveMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !messageDirty) return;
    void persist(
      giftUpdateInput(gift, gift.giftWrap, messageDraft.trim() || null),
      false,
    );
  };

  return (
    <section
      aria-labelledby={`${id}-title`}
      aria-busy={mutation.isPending || undefined}
      className="rounded-lg border border-gray-200 bg-gray-0 p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-h4 font-bold text-gray-1000">
            {copy.title}
          </h2>
          <p id={`${id}-description`} className="mt-1 type-body-sm text-gray-500">
            {copy.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {config ? (
            <span className="type-body-sm font-medium text-gray-800">
              <bdi>
                {gift.giftWrap ? "" : "+ "}
                {formatMoney(locale, config.fee, config.currency)}
              </bdi>
            </span>
          ) : null}
          <Switch
            id={`${id}-toggle`}
            checked={gift.giftWrap}
            disabled={busy || messageDirty || (!gift.giftWrap && !config?.enabled)}
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-description`}
            onCheckedChange={(checked) => {
              void persist(
                giftUpdateInput(gift, checked, gift.message),
                true,
              );
            }}
          />
        </div>
      </div>

      {showMessageEditor ? (
        <form className="mt-5 border-t border-gray-200 pt-5" onSubmit={saveMessage}>
          <Field>
            <FieldLabel htmlFor={`${id}-message`}>{copy.messageLabel}</FieldLabel>
            <Textarea
              id={`${id}-message`}
              name="giftMessage"
              value={messageDraft}
              disabled={busy}
              aria-describedby={
                messageDirty ? `${id}-message-unsaved` : undefined
              }
              onChange={(event) => {
                const nextMessage = event.target.value;
                setMessageDraft(nextMessage);
                onMessageDirtyChange(nextMessage !== persistedMessage);
                setError(null);
              }}
            />
            {messageDirty ? (
              <p id={`${id}-message-unsaved`} className="type-caption text-gray-600">
                {copy.unsaved}
              </p>
            ) : null}
          </Field>
          <Button
            type="submit"
            size="sm"
            className="mt-3"
            disabled={!messageDirty || disabled}
            loading={mutation.isPending}
            loadingLabel={copy.savingMessage}
          >
            {copy.saveMessage}
          </Button>
        </form>
      ) : null}

      <p aria-live="polite" className="mt-2 min-h-5 type-caption text-gray-500">
        {mutation.isPending ? copy.updating : ""}
      </p>
      {error ? (
        <p role="alert" className="type-body-sm text-destructive">
          {errorMessage(error, copy)}
        </p>
      ) : null}
    </section>
  );
}
