"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldFeedback } from "@/components/ui/field";
import { InputField } from "@/components/ui/input";
import { SaudiMobileField } from "@/components/ui/saudi-mobile-field";
import { CheckoutStepSection } from "@/features/checkout/components/checkout-step-section";
import type { CheckoutBuyer } from "@/features/checkout/types/checkout.types";
import {
  checkoutGuestBuyerFromDraft,
  isValidCheckoutEmail,
  type CheckoutGuestBuyerDraft,
} from "@/features/checkout/utils/checkout-buyer";
import { normalizeSaudiMobile } from "@/lib/phone/saudi-mobile";

export type CheckoutBuyerCopy = {
  title: string;
  name: string;
  email: string;
  phone: string;
  submit: string;
  committed: string;
  required: string;
  invalidEmail: string;
  invalidPhone: string;
  validation: string;
};

type BuyerErrors = Partial<Record<keyof CheckoutGuestBuyerDraft, "required" | "invalidEmail" | "invalidPhone">>;

const emptyDraft: CheckoutGuestBuyerDraft = { name: "", email: "", phone: "" };

export function CheckoutBuyerSection({
  copy,
  committedBuyer,
  onCommit,
}: {
  copy: CheckoutBuyerCopy;
  committedBuyer: Extract<CheckoutBuyer, { kind: "guest" }> | null;
  onCommit: (
    buyer: Extract<CheckoutBuyer, { kind: "guest" }> | null,
  ) => void;
}) {
  const [draft, setDraft] = useState(emptyDraft);
  const [errorKeys, setErrors] = useState<BuyerErrors>({});
  const errors = {
    name: errorKeys.name ? copy[errorKeys.name] : undefined,
    email: errorKeys.email ? copy[errorKeys.email] : undefined,
    phone: errorKeys.phone ? copy[errorKeys.phone] : undefined,
  };
  const [formErrorKey, setFormError] = useState<"validation" | null>(null);
  const formError = formErrorKey ? copy[formErrorKey] : null;
  const draftMatchesCommitted =
    committedBuyer !== null &&
    draft.name.trim() === committedBuyer.name &&
    draft.email.trim() === committedBuyer.email &&
    normalizeSaudiMobile(draft.phone) === committedBuyer.phone;

  const update = (field: keyof CheckoutGuestBuyerDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
    onCommit(null);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: BuyerErrors = {};
    if (!draft.name.trim()) nextErrors.name = "required";
    if (!draft.email.trim()) nextErrors.email = "required";
    else if (!isValidCheckoutEmail(draft.email)) {
      nextErrors.email = "invalidEmail";
    }
    if (!draft.phone.trim()) nextErrors.phone = "required";
    else if (!normalizeSaudiMobile(draft.phone)) {
      nextErrors.phone = "invalidPhone";
    }
    setErrors(nextErrors);
    const buyer = checkoutGuestBuyerFromDraft(draft);
    if (Object.keys(nextErrors).length > 0 || !buyer) {
      setFormError("validation");
      return;
    }
    setFormError(null);
    onCommit(buyer);
  };

  return (
    <CheckoutStepSection id="checkout-buyer" step="3" title={copy.title}>
      <form noValidate onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            feedbackMessages={[copy.required]}
            id="checkout-buyer-name"
            name="buyerName"
            autoComplete="name"
            required
            label={copy.name}
            value={draft.name}
            error={errors.name}
            onChange={(event) => update("name", event.target.value)}
          />
          <InputField
            feedbackMessages={[copy.required, copy.invalidEmail]}
            id="checkout-buyer-email"
            name="buyerEmail"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            required
            label={copy.email}
            value={draft.email}
            error={errors.email}
            onChange={(event) => update("email", event.target.value)}
          />
          <div className="sm:col-span-2">
            <SaudiMobileField
              feedbackMessages={[copy.required, copy.invalidPhone]}
              id="checkout-buyer-phone"
              name="buyerPhone"
              required
              label={copy.phone}
              value={draft.phone}
              error={errors.phone}
              onChange={(event) => update("phone", event.target.value)}
            />
          </div>
        </div>
        <FieldFeedback role="alert" className="mt-4" reserve={[copy.validation]}>
            {formError}
          </FieldFeedback>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit">{copy.submit}</Button>
          {draftMatchesCommitted ? (
            <p role="status" className="type-body-sm text-success">
              {copy.committed}
            </p>
          ) : null}
        </div>
      </form>
    </CheckoutStepSection>
  );
}
