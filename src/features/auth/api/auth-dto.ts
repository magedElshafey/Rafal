export const authEndpoints = {
  requestOtp: "/auth/phone/otp/request",
  verifyOtp: "/auth/phone/otp/verify",
  completeProfile: "/auth/complete-profile",
  me: "/auth/me",
} as const;

export type AuthUserDto = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string;
  profile_complete: boolean;
  created_at: string;
};

export type RequestOtpDto = { phone: string };
export type VerifyOtpDto = { phone: string; otp: string };
export type CompleteProfileDto = {
  first_name: string;
  last_name: string;
  phone: string;
  terms_accepted: boolean;
};
export type UpdateProfileDto = {
  email?: string;
  first_name: string;
  last_name: string;
  phone: string;
};

export type AuthMessageResponseDto = { success: boolean; message: string };
export type AuthUserResponseDto = {
  success: boolean;
  message: string;
  data: AuthUserDto;
};
export type VerifyOtpResponseDto = {
  success: boolean;
  message: string;
  data: {
    user: AuthUserDto;
    token: string;
    profile_complete: boolean;
  };
};
