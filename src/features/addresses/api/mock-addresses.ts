import "server-only";

import type { SavedAddress } from "@/features/addresses/types/saved-address.types";

export type MockAddressRecord = {
  customerId: string;
  address: SavedAddress;
};

export const mockAddressRecords: readonly MockAddressRecord[] = [
  {
    customerId: "mock-customer-01",
    address: {
      id: "address-home",
      fullName: "سارة عبدالله",
      phone: "+966 50 123 4567",
      city: "الرياض",
      district: "حي الياسمين",
      street: "شارع الأمير سلطان",
      additionalDetails: "منزل 12",
      postalCode: "",
      type: "home",
      isDefault: true,
    },
  },
  {
    customerId: "mock-customer-01",
    address: {
      id: "address-work",
      fullName: "سارة عبدالله",
      phone: "+966 50 123 4567",
      city: "جدة",
      district: "حي الشاطئ",
      street: "برج الأعمال",
      additionalDetails: "الدور 5",
      postalCode: "",
      type: "work",
      isDefault: false,
    },
  },
  {
    customerId: "mock-customer-01",
    address: {
      id: "address-parents",
      displayLabel: "منزل الوالدين",
      fullName: "عبدالله أحمد",
      phone: "+966 55 987 6543",
      city: "الدمام",
      district: "حي الشاطئ",
      street: "شارع الملك فهد",
      additionalDetails: "فيلا 7",
      postalCode: "",
      type: "home",
      isDefault: false,
    },
  },
  {
    customerId: "mock-customer-02",
    address: {
      id: "address-foreign",
      fullName: "عميل آخر",
      phone: "+966 50 000 0000",
      city: "الرياض",
      district: "حي العليا",
      street: "شارع التحلية",
      additionalDetails: "مبنى 3",
      postalCode: "",
      type: "work",
      isDefault: true,
    },
  },
];
