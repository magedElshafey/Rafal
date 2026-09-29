import type {
  CreateAddressDto,
  AddressDto,
  AddressListResponseDto,
  UpdateAddressDto,
} from "@/features/addresses/api/address-dto";
import type {
  Address,
  AddressPage,
  CreateAddressInput,
  UpdateAddressInput,
} from "@/features/addresses/types/address.types";

export function mapCreateAddressInput(
  input: CreateAddressInput,
): CreateAddressDto {
  return {
    label: input.label,
    recipient_name: input.recipientName,
    recipient_phone: input.recipientPhone,
    city_id: input.cityId,
    district: input.district,
    street_details: input.streetDetails,
    is_default: input.isDefault ? 1 : 0,
  };
}

export function mapUpdateAddressInput(
  input: UpdateAddressInput,
): UpdateAddressDto {
  const dto: Partial<CreateAddressDto> = {};
  if (input.label !== undefined) dto.label = input.label;
  if (input.recipientName !== undefined) {
    dto.recipient_name = input.recipientName;
  }
  if (input.recipientPhone !== undefined) {
    dto.recipient_phone = input.recipientPhone;
  }
  if (input.cityId !== undefined) dto.city_id = input.cityId;
  if (input.district !== undefined) dto.district = input.district;
  if (input.streetDetails !== undefined) {
    dto.street_details = input.streetDetails;
  }
  if (input.isDefault !== undefined) {
    dto.is_default = input.isDefault ? 1 : 0;
  }
  return dto as UpdateAddressDto;
}

export function mapAddress(dto: AddressDto): Address {
  return {
    id: String(dto.id),
    label: dto.label,
    recipientName: dto.recipient_name,
    recipientPhone: dto.recipient_phone,
    city: {
      id: dto.city.id,
      name: dto.city.name,
      region: { id: dto.city.region.id, name: dto.city.region.name },
    },
    district: dto.district,
    streetDetails: dto.street_details,
    isDefault: dto.is_default,
    isServiceable: dto.is_serviceable,
    createdAt: dto.created_at,
  };
}

export function mapAddressPage(response: AddressListResponseDto): AddressPage {
  return {
    items: response.data.map(mapAddress),
    pagination: {
      currentPage: response.meta.current_page,
      lastPage: response.meta.last_page,
      perPage: response.meta.per_page,
      total: response.meta.total,
    },
  };
}
