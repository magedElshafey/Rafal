import type {
  AccountProfileInput,
  AccountProfileValidationErrors,
} from "@/features/account/profile/types/account-profile.types";

const phonePattern = /^\+?[\d\s()-]+$/;

export function validateAccountProfile(
  profile: AccountProfileInput,
): AccountProfileValidationErrors {
  const errors: AccountProfileValidationErrors = {};

  if (!profile.firstName.trim()) errors.firstName = "required";
  if (!profile.lastName.trim()) errors.lastName = "required";

  const phone = profile.phone.trim();
  const phoneDigits = phone.replace(/\D/g, "");
  if (!phone) errors.phone = "required";
  else if (
    !phonePattern.test(phone) ||
    phoneDigits.length < 8 ||
    phoneDigits.length > 15
  ) {
    errors.phone = "phone";
  }

  return errors;
}
