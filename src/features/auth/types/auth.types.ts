import type { AuthenticatedUser } from "@/features/auth/types/authenticated-user.types";

export type RequestOtpInput = { email: string };
export type VerifyOtpInput = { code: string };
export type CompleteProfileInput = {
  firstName: string;
  lastName: string;
  phone: string;
  termsAccepted: boolean;
};

export type AuthActionErrorCode =
  | "invalid-input"
  | "pending-email-missing"
  | "unauthorized"
  | "service-unavailable";

export type AuthActionError = { code: AuthActionErrorCode };
export type AuthActionFailure = { ok: false; error: AuthActionError };
export type RequestOtpResult = { ok: true } | AuthActionFailure;
export type AuthenticatedActionResult =
  | {
      ok: true;
      user: AuthenticatedUser;
      profileComplete: boolean;
    }
  | AuthActionFailure;
