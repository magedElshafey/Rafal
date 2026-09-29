import type {
  CheckoutPaymentMethodsResponseDto,
  CheckoutQuoteDataDto,
  CheckoutQuoteLocationDto,
  CheckoutQuoteRequestDto,
  CheckoutQuoteShippingOptionDto,
  CheckoutQuoteTotalsDto,
  CheckoutQuoteTotalsLineDto,
  CheckoutQuoteWarehouseDto,
  CheckoutShippingMethodDto,
} from "@/features/checkout/api/checkout-dto";
import type {
  CheckoutPaymentMethod,
  CheckoutQuote,
  CheckoutQuoteLocation,
  CheckoutQuoteRequest,
  CheckoutQuoteShippingOption,
  CheckoutQuoteTotals,
  CheckoutQuoteTotalsLine,
  CheckoutQuoteWarehouse,
  CheckoutShippingMethod,
} from "@/features/checkout/types/checkout.types";

export function mapCheckoutPaymentMethods(
  data: CheckoutPaymentMethodsResponseDto["data"],
): readonly CheckoutPaymentMethod[] {
  return Object.entries(data).map(([code, method]) => ({
    code,
    label: method.label,
    icon: method.icon,
  }));
}

export function mapCheckoutShippingMethod(
  method: CheckoutShippingMethodDto,
): CheckoutShippingMethod {
  return {
    id: method.id,
    code: method.code,
    name: method.name,
    etaLabel: method.eta_label,
    price: method.price,
    isPickup: method.is_pickup,
  };
}

export function mapCheckoutQuoteRequest(
  input: CheckoutQuoteRequest,
): CheckoutQuoteRequestDto {
  const base = {
    city_id: input.cityId,
    ...(input.shippingMethodId === undefined
      ? {}
      : { shipping_method_id: input.shippingMethodId }),
  };

  if (input.addressId !== undefined) {
    if (input.address !== undefined) {
      throw new Error("Checkout quote requires exactly one address source.");
    }

    return { ...base, address_id: input.addressId };
  }

  if (input.address === undefined) {
    throw new Error("Checkout quote requires exactly one address source.");
  }

  return {
    ...base,
    address: {
      recipient_name: input.address.recipientName,
      recipient_phone: input.address.recipientPhone,
      district: input.address.district,
      street_details: input.address.streetDetails,
    },
  };
}

export function mapCheckoutQuoteShippingOption(
  option: CheckoutQuoteShippingOptionDto,
): CheckoutQuoteShippingOption {
  return {
    id: option.id,
    code: option.code,
    name: option.name,
    etaLabel: option.eta_label,
    price: option.price,
    fee: option.fee,
    isFree: option.is_free,
    isPickup: option.is_pickup,
  };
}

export function mapCheckoutQuoteWarehouse(
  warehouse: CheckoutQuoteWarehouseDto | null,
): CheckoutQuoteWarehouse | null {
  return warehouse
    ? {
        id: warehouse.id,
        name: warehouse.name,
      }
    : null;
}

export function mapCheckoutQuoteLocation(
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
      includedAmount: totals.vat.included_amount,
    },
    currency: totals.currency,
  };
}

export function mapCheckoutQuote(data: CheckoutQuoteDataDto): CheckoutQuote {
  return {
    totals: mapCheckoutQuoteTotals(data.totals),
    shippingOptions: data.shipping_options.map(mapCheckoutQuoteShippingOption),
    fulfillable: data.fulfillable,
    warehouse: mapCheckoutQuoteWarehouse(data.warehouse),
    unavailableLines: data.unavailable_lines,
    coupon: data.coupon
      ? {
          code: data.coupon.code,
          name: data.coupon.name,
          applied: data.coupon.applied,
          discount: data.coupon.discount,
        }
      : null,
    location: mapCheckoutQuoteLocation(data.location),
  };
}
