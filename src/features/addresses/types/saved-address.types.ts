export const addressTypeValues = ["home", "work"] as const;

export type AddressType = (typeof addressTypeValues)[number];

export type AddressInput = {
  fullName: string;
  phone: string;
  city: string;
  district: string;
  street: string;
  additionalDetails: string;
  postalCode: string;
  type: AddressType;
  isDefault: boolean;
};

export type SavedAddress = AddressInput & {
  id: string;
  displayLabel?: string;
};

export type AddressField = keyof AddressInput;
export type AddressValidationError =
  | "required"
  | "phone"
  | "postalCode"
  | "type"
  | "invalid";
export type AddressValidationErrors = Partial<
  Record<AddressField, AddressValidationError>
>;

export type AddressMutationFailureReason =
  | "validation"
  | "not-found"
  | "maximum-reached"
  | "default-address-delete-unsupported";

export type AddressMutationResult =
  | { ok: true }
  | {
      ok: false;
      reason: AddressMutationFailureReason;
      errors?: AddressValidationErrors;
    };
