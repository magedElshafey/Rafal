import type { Locale } from "next-intl";

const STORE_TIME_ZONE = "Asia/Riyadh";

export function formatOrderMoney(
  locale: Locale,
  amount: number,
  currency: "SAR",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatOrderDate(locale: Locale, value: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: STORE_TIME_ZONE,
  }).format(new Date(value));
}

export function formatOrderDateTime(locale: Locale, value: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone: STORE_TIME_ZONE,
  }).format(new Date(value));
}
