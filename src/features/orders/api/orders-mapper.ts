import type {
  OrderDetailsResponseDto,
  OrdersPageResponseDto,
} from "@/features/orders/api/orders-dto";
import type {
  OrderDetails,
  OrdersPage,
} from "@/features/orders/types/order.types";

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

export function mapOrderDetails(
  response: OrderDetailsResponseDto<number | null>,
): OrderDetails {
  const order = response.data;
  return {
    id: order.id,
    orderNumber: order.order_number,
    displayNumber: order.display_number,
    status: order.status,
    customerStatus: order.customer_status,
    requiresVerification: order.requires_verification,
    placedAt: order.placed_at,
    items: order.items.map((item) => ({
      orderItemId: String(item.id),
      productId:
        item.product_id === null ? null : String(item.product_id),
      productName: item.product_name,
      variantSku: item.variant_sku,
      variantAttributes: item.variant_attributes,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      discountAmount: item.discount_amount,
      lineTotal: item.line_total,
    })),
    gift: order.gift
      ? {
          isGift: order.gift.is_gift,
          isAnonymous: order.gift.is_anonymous,
          giftMessage: order.gift.gift_message,
          recipient: order.gift.recipient
            ? {
                name: order.gift.recipient.name,
                phone: order.gift.recipient.phone,
                city: order.gift.recipient.city
                  ? { ...order.gift.recipient.city }
                  : null,
                district: order.gift.recipient.district,
                streetDetails: order.gift.recipient.street_details,
              }
            : null,
        }
      : null,
    shippingAddress: {
      recipientName: order.shipping_address.recipient_name,
      recipientPhone: order.shipping_address.recipient_phone,
      city: order.shipping_address.city
        ? { ...order.shipping_address.city }
        : null,
      district: order.shipping_address.district,
      streetDetails: order.shipping_address.street_details,
    },
    shippingMethod: order.shipping_method
      ? {
          id: order.shipping_method.id,
          code: order.shipping_method.code,
          name: order.shipping_method.name,
        }
      : null,
    money: {
      subtotal: order.money.subtotal,
      discountTotal: order.money.discount_total,
      shippingFee: order.money.shipping_fee,
      personalizationTotal: order.money.personalization_total,
      giftWrapFee: order.money.gift_wrap_fee,
      taxableAmount: order.money.taxable_amount,
      vat: order.money.vat ? { ...order.money.vat } : null,
      total: order.money.total,
      currency: order.money.currency,
    },
    payment: {
      method: order.payment.method,
      status: order.payment.status,
      paidAt: order.payment.paid_at,
    },
    verificationExpiresAt: order.verification_expires_at,
    timeline: order.timeline.map((step) => ({
      step: step.step,
      reached: step.reached,
      reachedAt: step.reached_at,
    })),
    capabilities: {
      canCancel: order.can_cancel,
      canReorder: order.can_reorder,
      canRequestReturn: order.can_request_return,
    },
  };
}
