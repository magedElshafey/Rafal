import type { VariantAttributes } from "@/lib/variant-attributes";

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

export type OrderDetailsDto = {
  id: number;
  order_number: string;
  display_number: string;
  status: string;
  customer_status: string;
  requires_verification: boolean | null;
  placed_at: string;
  items: Array<{
    id: number;
    product_name: string;
    variant_sku: string | null;
    variant_attributes: VariantAttributes;
    quantity: number;
    unit_price: string;
    discount_amount: string | null;
    line_total: string;
  }>;
  gift: {
    is_gift: boolean;
    is_anonymous: boolean | null;
    gift_message: string | null;
    recipient: {
      name: string | null;
      phone: string | null;
      city: { id: number; name: string } | null;
      district: string | null;
      street_details: string | null;
    } | null;
  } | null;
  shipping_address: {
    recipient_name: string;
    recipient_phone: string;
    city: { id: number; name: string } | null;
    district: string;
    street_details: string;
  };
  shipping_method: {
    id: number | null;
    code: string | null;
    name: string | null;
  } | null;
  money: {
    subtotal: string | null;
    discount_total: string | null;
    shipping_fee: string | null;
    personalization_total: string | null;
    gift_wrap_fee: string | null;
    taxable_amount: string | null;
    vat: { rate: string | null; amount: string | null } | null;
    total: string;
    currency: string;
  };
  payment: {
    method: string | null;
    status: string;
    paid_at: string | null;
  };
  verification_expires_at: string | null;
  timeline: Array<{
    step: string;
    reached: boolean;
    reached_at: string | null;
  }>;
  can_cancel: boolean;
  can_reorder: boolean;
  can_request_return: boolean;
};

export type OrderDetailsResponseDto = {
  success: true;
  data: OrderDetailsDto;
};
