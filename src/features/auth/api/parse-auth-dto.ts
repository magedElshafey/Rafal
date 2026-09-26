import type {
  AuthMessageResponseDto,
  AuthUserDto,
  AuthUserResponseDto,
  VerifyOtpResponseDto,
} from "@/features/auth/api/auth-dto";
import type { AuthenticatedUser } from "@/features/auth/types/authenticated-user.types";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

export class AuthContractError extends Error {
  constructor(path: string, expected: string) {
    super(`Invalid Auth API payload at "${path}": expected ${expected}.`);
    this.name = "AuthContractError";
  }
}

const {
  parseBoolean,
  parseNonEmptyString,
  parseNullableString,
  parseRecord,
  parseString,
} = createRuntimeValidators(
  (path, expected) => new AuthContractError(path, expected),
);

function positiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new AuthContractError(path, "a positive integer");
  }
  return value;
}

function parseUser(value: unknown, path: string): AuthUserDto {
  const source = parseRecord(value, path);
  return {
    id: positiveInteger(source.id, `${path}.id`),
    first_name: parseNullableString(source.first_name, `${path}.first_name`),
    last_name: parseNullableString(source.last_name, `${path}.last_name`),
    email: parseNonEmptyString(source.email, `${path}.email`),
    phone: parseNullableString(source.phone, `${path}.phone`),
    profile_complete: parseBoolean(
      source.profile_complete,
      `${path}.profile_complete`,
    ),
    created_at: parseNonEmptyString(source.created_at, `${path}.created_at`),
  };
}

export function parseAuthMessageResponse(
  value: unknown,
): AuthMessageResponseDto {
  const source = parseRecord(value, "response");
  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
  };
}

export function parseVerifyOtpResponse(value: unknown): VerifyOtpResponseDto {
  const source = parseRecord(value, "response");
  const data = parseRecord(source.data, "response.data");
  const user = parseUser(data.user, "response.data.user");
  const profileComplete = parseBoolean(
    data.profile_complete,
    "response.data.profile_complete",
  );
  if (profileComplete !== user.profile_complete) {
    throw new AuthContractError(
      "response.data.profile_complete",
      "the same value as response.data.user.profile_complete",
    );
  }
  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
    data: {
      user,
      token: parseNonEmptyString(data.token, "response.data.token"),
      profile_complete: profileComplete,
    },
  };
}

export function parseAuthUserResponse(value: unknown): AuthUserResponseDto {
  const source = parseRecord(value, "response");
  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
    data: parseUser(source.data, "response.data"),
  };
}

export function mapAuthUser(dto: AuthUserDto): AuthenticatedUser {
  return {
    id: String(dto.id),
    firstName: dto.first_name ?? "",
    lastName: dto.last_name ?? "",
    email: dto.email,
    phone: dto.phone,
    profileComplete: dto.profile_complete,
    createdAt: dto.created_at,
  };
}
