import {
  addressTypeValues,
  type AddressValidationErrors,
} from "@/features/addresses/types/saved-address.types";

const phonePattern = /^\+?[\d\s()-]+$/;
const postalCodePattern = /^\d[\d\s-]{1,10}\d$/;

export function validateAddress(value: unknown): AddressValidationErrors {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      fullName: "required",
      phone: "required",
      city: "required",
      district: "required",
      street: "required",
      additionalDetails: "invalid",
      postalCode: "postalCode",
      type: "type",
      isDefault: "invalid",
    };
  }

  const address = value as Record<string, unknown>;
  const errors: AddressValidationErrors = {};

  const fullName =
    typeof address.fullName === "string" ? address.fullName.trim() : "";
  if (!fullName) errors.fullName = "required";

  const phone = typeof address.phone === "string" ? address.phone.trim() : "";
  const phoneDigits = phone.replace(/\D/g, "");
  if (!phone) errors.phone = "required";
  else if (
    !phonePattern.test(phone) ||
    phoneDigits.length < 8 ||
    phoneDigits.length > 15
  ) {
    errors.phone = "phone";
  }

  if (typeof address.city !== "string" || !address.city.trim()) {
    errors.city = "required";
  }
  if (typeof address.district !== "string" || !address.district.trim()) {
    errors.district = "required";
  }
  if (typeof address.street !== "string" || !address.street.trim()) {
    errors.street = "required";
  }

  const postalCode =
    typeof address.postalCode === "string" ? address.postalCode.trim() : "";
  if (
    typeof address.postalCode !== "string" ||
    (postalCode && !postalCodePattern.test(postalCode))
  ) {
    errors.postalCode = "postalCode";
  }

  if (typeof address.additionalDetails !== "string") {
    errors.additionalDetails = "invalid";
  }

  if (
    typeof address.type !== "string" ||
    !addressTypeValues.some((type) => type === address.type)
  ) {
    errors.type = "type";
  }

  if (typeof address.isDefault !== "boolean") {
    errors.isDefault = "invalid";
  }

  return errors;
}
