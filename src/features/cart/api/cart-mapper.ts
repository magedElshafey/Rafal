import type { CartDataDto } from "@/features/cart/api/cart-dto";
import type { CartLinePersonalization, CartMoney, CartSnapshot } from "@/features/cart/types/cart.types";

function money(amount: string, currency: string): CartMoney {
  return { amount, currency };
}

function mapPersonalization(value: unknown | null): CartLinePersonalization | null {
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    return { language: null, raw: value, text: null };
  }
  const source = value as Record<string, unknown>;
  const text = [source.text, source.personalization_text, source.normalized_text].find(
    (candidate): candidate is string => typeof candidate === "string",
  );
  return {
    language:
      typeof source.language === "string"
        ? source.language
        : typeof source.personalization_language === "string"
          ? source.personalization_language
          : null,
    raw: value,
    text: text ?? null,
  };
}

export function mapCartData(data: CartDataDto): CartSnapshot {
  const currency = data.totals.currency;
  return {
    city: data.city ?? null,
    lines: data.items.map((line) => ({
      id: String(line.id),
      product: {
        id: String(line.product.id),
        slug: line.product.slug,
        name: line.product.name,
        image: line.product.image
          ? { id: String(line.product.image.id), src: line.product.image.url }
          : null,
        personalizable: line.product.personalizable,
      },
      variant: {
        id: String(line.variant.id),
        sku: line.variant.sku,
        attributes: line.variant.attributes ?? {},
      },
      personalization: mapPersonalization(line.personalization),
      quantity: line.quantity,
      stock: line.stock,
      unitRegularPrice: money(line.unit_regular_price, currency),
      unitPrice: money(line.unit_price, currency),
      discountActive: line.discount_active,
      personalizationFee: money(line.personalization_fee, currency),
      lineTotal: money(line.line_total, currency),
    })),
    summary: {
      lineCount: data.lines_count,
      totalQuantity: data.items_count,
      subtotal: money(data.totals.subtotal, currency),
      productDiscountTotal: money(data.totals.product_discount_total, currency),
      personalizationTotal: money(data.totals.personalization_total, currency),
      couponDiscount: money(data.totals.coupon_discount, currency),
      giftWrapFee: money(data.totals.gift_wrap_fee, currency),
      shippingFee: data.totals.shipping_fee === null ? null : money(data.totals.shipping_fee, currency),
      freeShipping: {
        enabled: data.totals.free_shipping.enabled,
        threshold:
          data.totals.free_shipping.threshold === null
            ? null
            : money(data.totals.free_shipping.threshold, currency),
        qualifies: data.totals.free_shipping.qualifies,
        remaining:
          data.totals.free_shipping.remaining === null
            ? null
            : money(data.totals.free_shipping.remaining, currency),
      },
      total: money(data.totals.total, currency),
      vat: {
        rate: data.totals.vat.rate,
        includedAmount: money(data.totals.vat.amount, currency),
      },
    },
    coupon: data.coupon
      ? {
          code: data.coupon.code,
          name: data.coupon.name,
          applied: data.coupon.applied,
          discount: money(data.coupon.discount, currency),
        }
      : null,
    gift: {
      isGift: data.gift.is_gift,
      isAnonymous: data.gift.is_anonymous,
      message: data.gift.gift_message,
      giftWrap: data.gift.gift_wrap,
      recipient: data.gift.recipient,
    },
  };
}
