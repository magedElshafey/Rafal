export const ADDRESS_PAGE_SIZE = 15;

export type Address = {
  id: string;
  label: string;
  recipientName: string;
  recipientPhone: string;
  city: {
    id: number;
    name: string;
    region: { id: number; name: string };
  };
  district: string;
  streetDetails: string;
  isDefault: boolean;
  isServiceable: boolean;
  createdAt: string;
};

export type AddressPage = {
  items: readonly Address[];
  pagination: {
    currentPage: number;
    lastPage: number;
    perPage: typeof ADDRESS_PAGE_SIZE;
    total: number;
  };
};

export type CreateAddressInput = {
  label: string;
  recipientName: string;
  recipientPhone: string;
  cityId: number;
  district: string;
  streetDetails: string;
  isDefault: boolean;
};

type AtLeastOne<T> = {
  [Field in keyof T]: Required<Pick<T, Field>> & Partial<Omit<T, Field>>;
}[keyof T];

export type UpdateAddressInput = AtLeastOne<CreateAddressInput>;
export type AddressInputField = keyof CreateAddressInput;
export type AddressValidationErrors = Partial<
  Record<AddressInputField, "required" | "rejected">
>;

export type AddressMutationError =
  | { code: "invalid-input" }
  | { code: "validation-rejected"; fields: readonly AddressInputField[] }
  | { code: "unauthorized" }
  | { code: "not-found" }
  | { code: "service-unavailable" };

export type AddressMutationResult =
  | { ok: true; address: Address }
  | { ok: false; error: AddressMutationError };

export type DeleteAddressResult =
  | { ok: true }
  | { ok: false; error: AddressMutationError };
