import "server-only";

import { requireUser } from "@/features/auth/server/auth-boundary";
import { mockOrderRecords } from "@/features/orders/api/mock-orders";
import type {
  Order,
  OrderFilter,
} from "@/features/orders/types/order.types";
import { matchesOrderFilter } from "@/features/orders/utils/order-filters";

type GetOrdersOptions = {
  filter: OrderFilter;
};

export async function getOrders({ filter }: GetOrdersOptions): Promise<Order[]> {
  const user = await requireUser();

  return mockOrderRecords
    .filter((record) => record.customerId === user.id)
    .map((record) => record.order)
    .filter((order) => matchesOrderFilter(order.status, filter))
    .sort(
      (first, second) =>
        Date.parse(second.placedAt) - Date.parse(first.placedAt),
    );
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const user = await requireUser();
  const record = mockOrderRecords.find(
    (item) => item.customerId === user.id && item.order.id === orderId,
  );

  return record?.order ?? null;
}
