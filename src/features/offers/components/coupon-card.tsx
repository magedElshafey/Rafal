import type { ReactNode } from "react";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import type { Coupon } from "@/features/offers/types/offers.types";
import { couponTimestampToDate } from "@/features/offers/utils/coupon-date";

type CouponCardProps = {
  coupon: Coupon;
  locale: Locale;
  action: ReactNode;
};

export async function CouponCard({ coupon, locale, action }: CouponCardProps) {
  const t = await getTranslations({
    locale,
    namespace: "Common.offersPage",
  });

  const moneyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "SAR",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const percentFormatter = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 2,
  });

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  });

  const expiry =
    coupon.endsAt === null ? null : couponTimestampToDate(coupon.endsAt);

  const discountValue =
    coupon.type === "percent"
      ? percentFormatter.format(coupon.value / 100)
      : moneyFormatter.format(coupon.value);

  const hasConditions = coupon.minOrderAmount !== null || expiry !== null;

  return (
    <article
      className="
        group
        flex h-full min-w-0 flex-col
        overflow-hidden
        rounded-2xl
        border border-gray-200
        bg-gray-0
        hover:border-gold-600/30
        focus-within:border-gold-600/40
      "
    >
      <div aria-hidden="true" className="h-1 w-full bg-gold-600" />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-h4 font-medium text-foreground">
              {coupon.name}
            </h3>

            {coupon.description ? (
              <p className="mt-2 whitespace-pre-line break-words type-body text-gray-600">
                {coupon.description}
              </p>
            ) : null}
          </div>

          <div
            className="
              shrink-0
              rounded-xl
              border border-gold-600/20
              bg-gold-600/[0.06]
              px-3 py-2
              text-center
            "
          >
            <span className="whitespace-nowrap type-body-lg font-bold text-gold-600">
              {discountValue}
            </span>
          </div>
        </div>

        {hasConditions ? (
          <dl className="mt-4 flex flex-wrap gap-2">
            {coupon.minOrderAmount !== null ? (
              <div
                className="
                  inline-flex items-center gap-1.5
                  rounded-full
                  border border-gray-200
                  px-3 py-1.5
                  type-body-sm
                "
              >
                <dt className="text-gray-600">{t("minimumOrder")}</dt>

                <dd className="font-medium text-foreground">
                  {moneyFormatter.format(coupon.minOrderAmount)}
                </dd>
              </div>
            ) : null}

            {expiry ? (
              <div
                className="
                  inline-flex items-center gap-1.5
                  rounded-full
                  border border-gray-200
                  px-3 py-1.5
                  type-body-sm
                "
              >
                <dt className="text-gray-600">{t("expires")}</dt>

                <dd className="font-medium text-foreground">
                  <time dateTime={expiry.toISOString()}>
                    {dateFormatter.format(expiry)}
                  </time>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div className="mt-auto pt-5">
          <div className="border-t border-dashed border-gray-200 pt-4">
            <p className="type-body-sm text-gray-600">{t("couponCode")}</p>

            <div
              className="
                mt-2
                flex min-w-0
                items-center justify-between
                gap-3
                rounded-xl
                border border-dashed border-gold-600/30
                bg-gold-600/[0.04]
              p-2
              "
            >
              <code
                className="
                  block min-w-0 flex-1
                  select-text break-all
                  text-start
                  type-body-lg font-bold
                  tracking-[0.1em]
                  text-foreground
                  [unicode-bidi:isolate]
                "
              >
                {coupon.code}
              </code>

              <div className="flex shrink-0 items-center">{action}</div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
