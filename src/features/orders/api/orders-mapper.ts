import type { OrdersPageResponseDto } from "@/features/orders/api/orders-dto";
import type { OrdersPage } from "@/features/orders/types/order.types";

export function mapOrdersPage(response: OrdersPageResponseDto): OrdersPage {
  return {
    orders: response.data.map((order) => ({
      orderNumber: order.order_number,
      displayNumber: order.display_number,
      placedAt: order.placed_at,
      customerStatus: order.customer_status,
      statusLabel: order.status_label,
      total: order.total,
      currency: order.currency,
      itemsCount: order.items_count,
      firstItem: {
        name: order.first_item.name,
        imageUrl: order.first_item.image_url,
      },
    })),
    pagination: {
      currentPage: response.meta.current_page,
      lastPage: response.meta.last_page,
      perPage: response.meta.per_page,
      total: response.meta.total,
    },
  };
}
