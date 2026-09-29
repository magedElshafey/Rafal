export type AddressRegionDto = { id: number; name: string };

export type AddressCityDto = {
  id: number;
  name: string;
  region: AddressRegionDto;
};

export type AddressDto = {
  id: number;
  label: string;
  recipient_name: string;
  recipient_phone: string;
  city: AddressCityDto;
  district: string;
  street_details: string;
  is_default: boolean;
  is_serviceable: boolean;
  created_at: string;
};

export type CreateAddressDto = {
  label: string;
  recipient_name: string;
  recipient_phone: string;
  city_id: number;
  district: string;
  street_details: string;
  is_default: 0 | 1;
};

type AtLeastOne<T> = {
  [Field in keyof T]: Required<Pick<T, Field>> & Partial<Omit<T, Field>>;
}[keyof T];

export type UpdateAddressDto = AtLeastOne<CreateAddressDto>;

export type AddressListResponseDto = {
  success: boolean;
  message: string;
  data: readonly AddressDto[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: 15;
    total: number;
  };
};

export type AddressResponseDto = {
  success: boolean;
  message: string;
  data: AddressDto;
};

export type DeleteAddressResponseDto = {
  success: boolean;
  message: string;
};
