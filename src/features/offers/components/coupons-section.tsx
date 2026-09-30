import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { CouponCard } from "@/features/offers/components/coupon-card";
import type { Coupon } from "@/features/offers/types/offers.types";

export async function CouponsSection({ coupons, locale }: { coupons: readonly Coupon[]; locale: Locale }) {
  if (coupons.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "Common.offersPage" });
  return (
    <section aria-labelledby="offers-coupons-title" className="space-y-5">
      <h2 id="offers-coupons-title" className="text-h3 font-medium text-foreground">{t("couponsTitle")}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {coupons.map((coupon, index) => (
          <CouponCard key={coupon.code + ":" + index} coupon={coupon} locale={locale} />
        ))}
      </div>
    </section>
  );
}
