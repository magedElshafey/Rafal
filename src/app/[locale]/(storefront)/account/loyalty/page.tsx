import { getLocale, getTranslations } from "next-intl/server";
import { getLoyaltySummary } from "@/features/loyalty/api/loyalty-api.server";
import { getLoyaltyHistory } from "@/features/loyalty/api/loyalty-history-api.server";
import { LoyaltySummary } from "@/features/loyalty/components/loyalty-summary";
import { LoyaltyHistory } from "@/features/loyalty/components/loyalty-history";

export default async function AccountLoyaltyPage() {
  const locale = await getLocale();
  const [summary, history, t] = await Promise.all([
    getLoyaltySummary(locale),
    getLoyaltyHistory(locale).catch(() => null),
    getTranslations("Account.loyalty"),
  ]);
  return <div>
    <h1 className="text-h2 font-bold text-gray-1000">{t("title")}</h1>
    <div className="mt-6 space-y-5">
      <LoyaltySummary summary={summary} locale={locale} />
      <LoyaltyHistory key={locale} locale={locale} initialPage={history} />
    </div>
  </div>;
}
