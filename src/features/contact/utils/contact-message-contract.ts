import {
  contactFields,
  type ContactFieldErrors,
  type ContactMessageInput,
} from "@/features/contact/types/contact-message.types";
import { normalizeSaudiMobile } from "@/lib/phone/saudi-mobile";

// Same email convention as OTP and public guest lookup; no shared email helper exists.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;

export function isContactRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateContactMessage(value: unknown):
  | { ok: true; input: ContactMessageInput }
  | { ok: false; fieldErrors: ContactFieldErrors } {
  if (!isContactRecord(value)) return { ok: false, fieldErrors: {} };

  const input: ContactMessageInput = { name: "", email: "", phone: "", subject: "", message: "" };
  const fieldErrors: ContactFieldErrors = {};
  for (const field of contactFields) {
    input[field] = typeof value[field] === "string" ? value[field].trim() : "";
    if (!input[field]) fieldErrors[field] = "invalid";
  }

  input.email = input.email.toLowerCase();
  if (input.email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(input.email)) {
    fieldErrors.email = "invalid";
  }
  const phone = normalizeSaudiMobile(input.phone);
  if (!phone) fieldErrors.phone = "invalid";
  else input.phone = phone;

  // Strict public BFF contract: extra fields never reach Laravel.
  if (Object.keys(value).some((key) => !contactFields.some((field) => field === key)) ||
      Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, input };
}

export function parseContactFieldErrors(value: unknown): ContactFieldErrors {
  if (!isContactRecord(value)) return {};
  const errors: ContactFieldErrors = {};
  for (const field of contactFields) {
    if (value[field] === "invalid") errors[field] = "invalid";
  }
  return errors;
}
