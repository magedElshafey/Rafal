import type { Locale } from "next-intl";

export type AccountProfileInput = {
  firstName: string;
  lastName: string;
  phone: string;
};

export type UpdateAccountProfileActionInput = AccountProfileInput & {
  locale: Locale;
};

export type AccountProfile = AccountProfileInput & {
  email: string;
};

export type AccountProfileField = keyof AccountProfileInput;
export type AccountProfileValidationError = "required" | "phone" | "invalid";
export type AccountProfileValidationErrors = Partial<
  Record<AccountProfileField, AccountProfileValidationError>
>;

export type AccountProfileMutationResult =
  | { ok: true; profile: AccountProfileInput }
  | {
      ok: false;
      error:
        | {
            code: "invalid-input";
            fields: AccountProfileValidationErrors;
          }
        | { code: "unauthorized" | "service-unavailable" };
    };
