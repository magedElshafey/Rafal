export type AccountProfileInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type AccountProfile = AccountProfileInput;

export type AccountProfileField = keyof AccountProfileInput;
export type AccountProfileValidationError = "required" | "email" | "phone";
export type AccountProfileValidationErrors = Partial<
  Record<AccountProfileField, AccountProfileValidationError>
>;
