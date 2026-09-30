import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { CopyCouponButton } from "@/features/offers/components/copy-coupon-button";
import type { Coupon } from "@/features/offers/types/offers.types";
import { couponTimestampToDate } from "@/features/offers/utils/coupon-date";

export async function CouponCard({ coupon, locale }: {
  coupon: Coupon;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "Common.offersPage" });
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 20 });
  const percent = new Intl.NumberFormat(locale, {
    style: "percent", maximumFractionDigits: 20,
  });
  const expiry = coupon.endsAt === null ? null : couponTimestampToDate(coupon.endsAt);
  const hasDetails = coupon.minOrderAmount !== null || coupon.maxDiscountAmount !== null || expiry !== null;
  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-lg border border-gray-200 bg-gray-0 p-6">
      <h3 className="break-words text-h4 font-medium text-foreground">{coupon.name}</h3>
      <p className="type-body-lg font-bold text-gold-600">
        {coupon.type === "percent"
          ? t("percentDiscount", { value: percent.format(coupon.value / 100) })
          : t("fixedDiscount")}
      </p>
      <p className="min-h-12 whitespace-pre-line break-words type-body text-gray-600">{coupon.description}</p>
      {hasDetails ? (
        <dl className="space-y-2 type-body-sm text-gray-600">
          {coupon.minOrderAmount !== null ? (
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
              <dt>{t("minimumOrder")}</dt>
              <dd>{number.format(coupon.minOrderAmount)}</dd>
            </div>
          ) : null}
          {coupon.maxDiscountAmount !== null ? (
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
              <dt>{t("maximumDiscount")}</dt>
              <dd>{number.format(coupon.maxDiscountAmount)}</dd>
            </div>
          ) : null}
          {expiry ? (
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
              <dt>{t("expires")}</dt>
              <dd>
                <time dateTime={expiry.toISOString()}>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium", timeZone: "UTC",
                  }).format(expiry)}
                </time>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <div className="mt-auto space-y-3 border-t border-gray-200 pt-4">
        <div className="space-y-1">
          <p className="type-body-sm text-gray-600">{t("couponCode")}</p>
          <code dir="ltr" className="block select-text break-all text-start type-body-lg font-bold [unicode-bidi:isolate]">{coupon.code}</code>
        </div>
        <CopyCouponButton
          code={coupon.code}
          label={t("copy")}
          accessibleLabel={t("copyCode", { code: coupon.code })}
          copied={t("copied")}
          failed={t("copyFailed")}
        />
      </div>
    </article>
  );
}
