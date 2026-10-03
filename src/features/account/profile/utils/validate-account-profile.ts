import type {
  AccountProfileInput,
  AccountProfileValidationErrors,
} from "@/features/account/profile/types/account-profile.types";
import { isValidSaudiMobile } from "@/lib/phone/saudi-mobile";

export function validateAccountProfile(
  profile: AccountProfileInput,
): AccountProfileValidationErrors {
  const errors: AccountProfileValidationErrors = {};

  if (!profile.firstName.trim()) errors.firstName = "required";
  if (!profile.lastName.trim()) errors.lastName = "required";

  const phone = profile.phone.trim();
  if (!phone) errors.phone = "required";
  else if (!isValidSaudiMobile(phone)) errors.phone = "phone";

  return errors;
}
