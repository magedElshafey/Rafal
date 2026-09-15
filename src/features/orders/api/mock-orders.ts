import "server-only";

import type {
  Order,
  OrderAddress,
  OrderGiftSnapshot,
  OrderItem,
  OrderStatus,
  OrderTimelineEvent,
} from "@/features/orders/types/order.types";

type MockOrderRecord = {
  customerId: string;
  order: Order;
};

const purchasedItems: OrderItem[] = [
  {
    id: "order-item-necklace",
    imageUrl: "/images/home/heart-necklace.png",
    name: {
      ar: "سلسلة فضة بالاسم",
      en: "Personalized silver necklace",
    },
    details: [
      {
        ar: "النقش: سارة",
        en: "Engraving: Sara",
      },
    ],
    quantity: 1,
    unitPrice: 150,
  },
  {
    id: "order-item-bracelet",
    imageUrl: "/images/home/name-necklace.png",
    name: {
      ar: "أسوارة راقي جلد",
      en: "Elegant leather bracelet",
    },
    details: [
      {
        ar: "اللون: أسود",
        en: "Color: Black",
      },
    ],
    quantity: 1,
    unitPrice: 170,
  },
  {
    id: "order-item-incense",
    imageUrl: "/images/home/heart-necklace.png",
    name: {
      ar: "مبخرة شخصية بالاسم",
      en: "Personalized incense burner",
    },
    details: [
      {
        ar: "النقش: منزل آل أحمد",
        en: "Engraving: Al Ahmed home",
      },
    ],
    quantity: 1,
    unitPrice: 213.5,
  },
];

type CreateOrderOptions = {
  id: string;
  placedAt: string;
  status: OrderStatus;
  timeline: OrderTimelineEvent[];
  shipmentTrackingNumber?: string;
  gift?: OrderGiftSnapshot;
  shippingAddress?: OrderAddress;
};

function createOrder({
  gift,
  id,
  placedAt,
  shipmentTrackingNumber,
  shippingAddress,
  status,
  timeline,
}: CreateOrderOptions): Order {
  return {
    id,
    placedAt,
    status,
    ...(shipmentTrackingNumber ? { shipmentTrackingNumber } : {}),
    ...(gift ? { gift } : {}),
    items: purchasedItems.map((item) => ({
      ...item,
      details: item.details.map((detail) => ({ ...detail })),
    })),
    timeline,
    shippingAddress: shippingAddress ?? {
      recipientName: "سارة عبدالله",
      city: "الرياض",
      district: "حي الياسمين",
      street: "شارع الأمير سلطان",
      building: "منزل 12",
    },
    payment: {
      method: "mada",
      total: 533.5,
      currency: "SAR",
    },
  };
}

export const mockOrderRecords: readonly MockOrderRecord[] = [
  {
    customerId: "mock-customer-01",
    order: createOrder({
      id: "RF-10482",
      placedAt: "2026-08-12T10:30:00+03:00",
      status: "delivered",
      shipmentTrackingNumber: "SPL-784512963",
      timeline: [
        { stage: "confirmed", completedAt: "2026-08-12T10:30:00+03:00" },
        { stage: "processing", completedAt: "2026-08-12T14:00:00+03:00" },
        { stage: "shipped", completedAt: "2026-08-13T09:15:00+03:00" },
        { stage: "delivered", completedAt: "2026-08-18T16:20:00+03:00" },
      ],
    }),
  },
  {
    customerId: "mock-customer-01",
    order: createOrder({
      id: "RF-10399",
      placedAt: "2026-07-29T13:10:00+03:00",
      status: "shipped",
      shipmentTrackingNumber: "SPL-315729408",
      timeline: [
        { stage: "confirmed", completedAt: "2026-07-29T13:10:00+03:00" },
        { stage: "processing", completedAt: "2026-07-30T09:20:00+03:00" },
        { stage: "shipped", completedAt: "2026-07-31T15:45:00+03:00" },
        { stage: "delivered" },
      ],
    }),
  },
  {
    customerId: "mock-customer-01",
    order: createOrder({
      id: "RF-10321",
      placedAt: "2026-07-02T11:45:00+03:00",
      status: "cancelled",
      timeline: [
        { stage: "confirmed", completedAt: "2026-07-02T11:45:00+03:00" },
        { stage: "cancelled", completedAt: "2026-07-02T12:30:00+03:00" },
      ],
    }),
  },
  {
    customerId: "mock-customer-01",
    order: createOrder({
      id: "RF-10250",
      placedAt: "2026-06-25T17:05:00+03:00",
      status: "returned",
      shipmentTrackingNumber: "SPL-902641537",
      timeline: [
        { stage: "confirmed", completedAt: "2026-06-25T17:05:00+03:00" },
        { stage: "processing", completedAt: "2026-06-25T19:10:00+03:00" },
        { stage: "shipped", completedAt: "2026-06-26T10:15:00+03:00" },
        { stage: "delivered", completedAt: "2026-06-29T16:40:00+03:00" },
        { stage: "returned", completedAt: "2026-07-02T13:20:00+03:00" },
      ],
    }),
  },
  {
    customerId: "mock-customer-01",
    order: createOrder({
      id: "RF-10188",
      placedAt: "2026-06-03T09:30:00+03:00",
      status: "processing",
      gift: {
        recipientName: "نورة عبدالله",
        recipientPhone: "+966 50 123 4567",
        city: "الرياض",
        district: "حي النرجس",
        streetDetails: "شارع عثمان بن عفان، منزل 8",
        giftMessage: "كل عام وأنتِ بخير",
      },
      shippingAddress: {
        recipientName: "نورة عبدالله",
        city: "الرياض",
        district: "حي النرجس",
        street: "شارع عثمان بن عفان",
        building: "منزل 8",
      },
      timeline: [
        { stage: "confirmed", completedAt: "2026-06-03T09:30:00+03:00" },
        { stage: "processing", completedAt: "2026-06-03T12:10:00+03:00" },
        { stage: "shipped" },
        { stage: "delivered" },
      ],
    }),
  },
  {
    customerId: "mock-customer-02",
    order: createOrder({
      id: "RF-99999",
      placedAt: "2026-08-20T12:00:00+03:00",
      status: "delivered",
      timeline: [
        { stage: "confirmed", completedAt: "2026-08-20T12:00:00+03:00" },
        { stage: "processing", completedAt: "2026-08-20T15:00:00+03:00" },
        { stage: "shipped", completedAt: "2026-08-21T09:00:00+03:00" },
        { stage: "delivered", completedAt: "2026-08-24T13:30:00+03:00" },
      ],
    }),
  },
];
