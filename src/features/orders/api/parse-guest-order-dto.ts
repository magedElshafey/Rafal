import { parseGuestCompatibleOrderDetailsResponse } from "@/features/orders/api/parse-orders-dto";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseGuestOrderLookupResponse(value: unknown) {
  if (!isRecord(value) || !isRecord(value.data)) {
    return parseGuestCompatibleOrderDetailsResponse(value);
  }

  const data = value.data;
  const money = isRecord(data.money) ? data.money : data.money;
  const normalizedMoney = isRecord(money)
    ? {
        ...money,
        vat:
          money.vat !== undefined
            ? money.vat
            : money.vat_amount === undefined
              ? null
              : { rate: null, amount: money.vat_amount },
      }
    : money;
  const timeline = Array.isArray(data.timeline)
    ? data.timeline.map((event) =>
        isRecord(event)
          ? {
              ...event,
              reached_at:
                event.reached_at === undefined ? null : event.reached_at,
            }
          : event,
      )
    : data.timeline;

  return parseGuestCompatibleOrderDetailsResponse({
    ...value,
    data: {
      ...data,
      requires_verification: data.requires_verification ?? null,
      can_request_return: data.can_request_return ?? false,
      money: normalizedMoney,
      timeline,
    },
  });
}
