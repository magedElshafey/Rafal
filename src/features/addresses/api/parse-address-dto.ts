import type {
  AddressDto,
  AddressListResponseDto,
  AddressResponseDto,
  DeleteAddressResponseDto,
} from "@/features/addresses/api/address-dto";
import { ADDRESS_PAGE_SIZE } from "@/features/addresses/types/address.types";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

export class AddressContractError extends Error {
  constructor(path: string, expected: string) {
    super(`Invalid Addresses API payload at "${path}": expected ${expected}.`);
    this.name = "AddressContractError";
  }
}

const { parseArray, parseBoolean, parseRecord, parseString } =
  createRuntimeValidators(
    (path, expected) => new AddressContractError(path, expected),
  );

function positiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new AddressContractError(path, "a positive integer");
  }
  return value;
}

function nonNegativeInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new AddressContractError(path, "a non-negative integer");
  }
  return value;
}

function parseAddress(value: unknown, path: string): AddressDto {
  const source = parseRecord(value, path);
  const city = parseRecord(source.city, `${path}.city`);
  const region = parseRecord(city.region, `${path}.city.region`);

  return {
    id: positiveInteger(source.id, `${path}.id`),
    label: parseString(source.label, `${path}.label`),
    recipient_name: parseString(source.recipient_name, `${path}.recipient_name`),
    recipient_phone: parseString(source.recipient_phone, `${path}.recipient_phone`),
    city: {
      id: positiveInteger(city.id, `${path}.city.id`),
      name: parseString(city.name, `${path}.city.name`),
      region: {
        id: positiveInteger(region.id, `${path}.city.region.id`),
        name: parseString(region.name, `${path}.city.region.name`),
      },
    },
    district: parseString(source.district, `${path}.district`),
    street_details: parseString(source.street_details, `${path}.street_details`),
    is_default: parseBoolean(source.is_default, `${path}.is_default`),
    is_serviceable: parseBoolean(source.is_serviceable, `${path}.is_serviceable`),
    created_at: parseString(source.created_at, `${path}.created_at`),
  };
}

export function parseAddressListResponse(value: unknown): AddressListResponseDto {
  const source = parseRecord(value, "response");
  const meta = parseRecord(source.meta, "response.meta");
  const perPage = positiveInteger(meta.per_page, "response.meta.per_page");
  if (perPage !== ADDRESS_PAGE_SIZE) {
    throw new AddressContractError("response.meta.per_page", String(ADDRESS_PAGE_SIZE));
  }

  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
    data: parseArray(source.data, "response.data").map((address, index) =>
      parseAddress(address, `response.data[${index}]`),
    ),
    meta: {
      current_page: positiveInteger(meta.current_page, "response.meta.current_page"),
      last_page: positiveInteger(meta.last_page, "response.meta.last_page"),
      per_page: ADDRESS_PAGE_SIZE,
      total: nonNegativeInteger(meta.total, "response.meta.total"),
    },
  };
}

export function parseAddressResponse(value: unknown): AddressResponseDto {
  const source = parseRecord(value, "response");
  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
    data: parseAddress(source.data, "response.data"),
  };
}

export function parseDeleteAddressResponse(value: unknown): DeleteAddressResponseDto {
  const source = parseRecord(value, "response");
  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
  };
}
