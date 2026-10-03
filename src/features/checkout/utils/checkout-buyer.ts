import type { CheckoutBuyer } from "@/features/checkout/types/checkout.types";
import { normalizeSaudiMobile } from "@/lib/phone/saudi-mobile";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CheckoutGuestBuyerDraft = {
  name: string;
  email: string;
  phone: string;
};

export function isValidCheckoutEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function checkoutGuestBuyerFromDraft(
  draft: CheckoutGuestBuyerDraft,
): Extract<CheckoutBuyer, { kind: "guest" }> | null {
  const name = draft.name.trim();
  const email = draft.email.trim();
  const phone = normalizeSaudiMobile(draft.phone);

  return name && isValidCheckoutEmail(email) && phone
    ? { kind: "guest", name, email, phone }
    : null;
}
