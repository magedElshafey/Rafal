import type {
  CheckoutQuoteDataDto,
  CheckoutQuoteLocationDto,
  CheckoutQuoteShippingOptionDto,
  CheckoutQuoteTotalsDto,
  CheckoutQuoteTotalsLineDto,
  CheckoutQuoteWarehouseDto,
} from "@/features/checkout/api/checkout-dto";
import type {
  CheckoutQuote,
  CheckoutQuoteLocation,
  CheckoutShippingOption,
  CheckoutQuoteTotals,
  CheckoutQuoteTotalsLine,
  CheckoutQuoteWarehouse,
} from "@/features/checkout/types/checkout.types";

function mapCheckoutQuoteShippingOption(
  option: CheckoutQuoteShippingOptionDto,
): CheckoutShippingOption {
  return {
    id: option.id,
    code: option.code,
    name: option.name,
    etaLabel: option.eta_label,
    price: option.price,
    fee: option.fee,
    isFree: option.is_free,
  };
}

function mapCheckoutQuoteWarehouse(
  warehouse: CheckoutQuoteWarehouseDto | null,
): CheckoutQuoteWarehouse | null {
  return warehouse
    ? {
        id: warehouse.id,
        name: warehouse.name,
      }
    : null;
}

function mapCheckoutQuoteLocation(
  location: CheckoutQuoteLocationDto,
): CheckoutQuoteLocation {
  return {
    inCoverage: location.in_coverage,
    city: {
      id: location.city.id,
      name: location.city.name,
    },
  };
}

function mapCheckoutQuoteTotalsLine(
  line: CheckoutQuoteTotalsLineDto,
): CheckoutQuoteTotalsLine {
  return {
    unitRegularPrice: line.unit_regular_price,
    unitPrice: line.unit_price,
    discountPerUnit: line.discount_per_unit,
    quantity: line.quantity,
    lineSubtotal: line.line_subtotal,
    personalizationFee: line.personalization_fee,
    lineTotal: line.line_total,
    discountActive: line.discount_active,
  };
}

function mapCheckoutQuoteTotals(
  totals: CheckoutQuoteTotalsDto,
): CheckoutQuoteTotals {
  return {
    lines: totals.lines.map(mapCheckoutQuoteTotalsLine),
    itemsCount: totals.items_count,
    linesCount: totals.lines_count,
    subtotal: totals.subtotal,
    productDiscountTotal: totals.product_discount_total,
    personalizationTotal: totals.personalization_total,
    couponDiscount: totals.coupon_discount,
    giftWrapFee: totals.gift_wrap_fee,
    shippingFee: totals.shipping_fee,
    freeShipping: {
      enabled: totals.free_shipping.enabled,
      threshold: totals.free_shipping.threshold,
      qualifies: totals.free_shipping.qualifies,
      remaining: totals.free_shipping.remaining,
    },
    total: totals.total,
    vat: {
      rate: totals.vat.rate,
      amount: totals.vat.amount,
    },
    currency: totals.currency,
  };
}

export function mapCheckoutQuote(data: CheckoutQuoteDataDto): CheckoutQuote {
  return {
    totals: mapCheckoutQuoteTotals(data.totals),
    // Pickup options are contract-valid, but delivery is the only selectable
    // fulfillment method in the current Checkout scope.
    shippingOptions: data.shipping_options
      .filter((option) => !option.is_pickup)
      .map(mapCheckoutQuoteShippingOption),
    fulfillable: data.fulfillable,
    warehouse: mapCheckoutQuoteWarehouse(data.warehouse),
    unavailableLines: data.unavailable_lines.map((line) => ({
      cartItemId: line.cart_item_id,
      productName: {
        ar: line.product_name.ar,
        en: line.product_name.en,
      },
      requested: line.requested,
      available: line.available,
      variantTotalRequested: line.variant_total_requested,
    })),
    coupon: data.coupon
      ? {
          code: data.coupon.code,
          valid: data.coupon.valid,
          reason: data.coupon.reason,
        }
      : null,
    location: mapCheckoutQuoteLocation(data.location),
  };
}
