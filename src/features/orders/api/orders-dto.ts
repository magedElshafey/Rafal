export type OrderListItemDto = {
  order_number: string;
  display_number: string;
  placed_at: string;
  customer_status: string;
  status_label: string;
  total: string;
  currency: string;
  items_count: number;
  first_item: {
    name: string;
    image_url: string | null;
  };
};

export type OrdersPageResponseDto = {
  success: true;
  data: OrderListItemDto[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};
