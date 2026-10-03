import type {
  AddressInputField,
  AddressValidationErrors,
  CreateAddressInput,
  UpdateAddressInput,
} from "@/features/addresses/types/address.types";
import { normalizeSaudiMobile } from "@/lib/phone/saudi-mobile";

const inputFields = [
  "label",
  "recipientName",
  "recipientPhone",
  "cityId",
  "district",
  "streetDetails",
  "isDefault",
] as const satisfies readonly AddressInputField[];

type ParseResult<T> =
  | { ok: true; input: T }
  | { ok: false; errors: AddressValidationErrors };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyInputFields(value: Record<string, unknown>) {
  return Object.keys(value).every((key) =>
    inputFields.some((field) => field === key),
  );
}

function parseFields(
  value: Record<string, unknown>,
  required: boolean,
): { input: Partial<CreateAddressInput>; errors: AddressValidationErrors } {
  const input: Partial<CreateAddressInput> = {};
  const errors: AddressValidationErrors = {};

  for (const field of inputFields) {
    if (!(field in value)) {
      if (required) errors[field] = "required";
      continue;
    }

    if (field === "cityId") {
      if (
        typeof value.cityId !== "number" ||
        !Number.isSafeInteger(value.cityId) ||
        value.cityId <= 0
      ) {
        errors.cityId = "required";
      } else {
        input.cityId = value.cityId;
      }
      continue;
    }

    if (field === "isDefault") {
      if (typeof value.isDefault !== "boolean") {
        errors.isDefault = "rejected";
      } else {
        input.isDefault = value.isDefault;
      }
      continue;
    }

    if (field === "recipientPhone") {
      const raw = value.recipientPhone;
      if (typeof raw !== "string" || !raw.trim()) {
        errors.recipientPhone = "required";
      } else {
        const normalized = normalizeSaudiMobile(raw);
        if (normalized) input.recipientPhone = normalized;
        else errors.recipientPhone = "rejected";
      }
      continue;
    }

    const raw = value[field];
    const normalized = typeof raw === "string" ? raw.trim() : "";
    if (!normalized) errors[field] = "required";
    else input[field] = normalized;
  }

  return { input, errors };
}

export function parseCreateAddressInput(value: unknown): ParseResult<CreateAddressInput> {
  if (!isRecord(value) || !hasOnlyInputFields(value)) {
    return { ok: false, errors: { label: "required" } };
  }
  const parsed = parseFields(value, true);
  if (Object.keys(parsed.errors).length > 0) {
    return { ok: false, errors: parsed.errors };
  }
  return { ok: true, input: parsed.input as CreateAddressInput };
}

export function parseUpdateAddressInput(value: unknown): ParseResult<UpdateAddressInput> {
  if (
    !isRecord(value) ||
    !hasOnlyInputFields(value) ||
    Object.keys(value).length === 0
  ) {
    return { ok: false, errors: {} };
  }
  const parsed = parseFields(value, false);
  if (Object.keys(parsed.errors).length > 0) {
    return { ok: false, errors: parsed.errors };
  }
  return { ok: true, input: parsed.input as UpdateAddressInput };
}
