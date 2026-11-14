import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { CrownIcon, InfoIcon } from "@/components/ui/icons/interface-icons";
import type { LoyaltySummary as Summary } from "@/features/loyalty/types/loyalty.types";

export async function LoyaltySummary({ summary, locale }: { summary: Summary; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Account.loyalty" });
  const number = new Intl.NumberFormat(locale);
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "SAR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dates = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Riyadh" });
  const settings = summary.howItWorks;
  const rules = [
    t("howItWorks.earning", { amount: money.format(Number(settings.amountPerPoint)) }),
    t("howItWorks.redemption", { points: number.format(settings.redeemPoints), amount: money.format(Number(settings.redeemAmount)) }),
    t("howItWorks.maximum", { percent: number.format(settings.maxRedeemPercent) }),
    t("howItWorks.minimum", { points: number.format(settings.minRedeemPoints) }),
    t("howItWorks.availability", { days: number.format(settings.returnWindowDays) }),
    ...(settings.validityMonths === undefined ? [] : [settings.validityMonths === null
      ? t("howItWorks.noExpiry")
      : t("howItWorks.validity", { months: number.format(settings.validityMonths) })]),
  ];

  return (
    <>
      <section aria-labelledby="loyalty-balance-title" className="flex min-h-44 flex-col items-center justify-center rounded-lg bg-gray-1000 px-5 py-8 text-center text-gray-0 sm:px-8">
        <CrownIcon aria-hidden="true" className="size-6" />
        <h2 id="loyalty-balance-title" className="mt-2 max-w-full break-words text-display font-bold">
          <span className="sr-only">{t("balance.description")}: </span>
          {t.rich("balance.points", { points: number.format(summary.available), value: (chunks) => <bdi>{chunks}</bdi> })}
        </h2>
        <p className="mt-2 max-w-full break-words type-body-sm text-gray-300">
          {t.rich("balance.value", { amount: money.format(Number(summary.valueSar)), value: (chunks) => <bdi>{chunks}</bdi> })}
        </p>
        {summary.pending > 0 || summary.expiringSoon ? (
          <div className="mt-4 max-w-full space-y-2 border-t border-gray-700 pt-3 type-body-sm text-gold-200">
            {summary.pending > 0 ? (
              <p>
                {t.rich("balance.pending", { points: number.format(summary.pending), value: (chunks) => <bdi>{chunks}</bdi> })}
                {summary.pendingAvailableOn ? <>{" — "}{t("balance.availableOn")} <time dateTime={summary.pendingAvailableOn}>{dates.format(new Date(summary.pendingAvailableOn))}</time></> : null}
              </p>
            ) : null}
            {summary.expiringSoon ? (
              <p>{t.rich("balance.expiring", { points: number.format(summary.expiringSoon.points), value: (chunks) => <bdi>{chunks}</bdi> })} <time dateTime={summary.expiringSoon.expiresAt}>{dates.format(new Date(summary.expiringSoon.expiresAt))}</time></p>
            ) : null}
          </div>
        ) : null}
      </section>

      {summary.isPaused ? (
        <aside role="note" className="flex items-start gap-2 rounded-lg bg-gray-100 px-4 py-3 type-body-sm text-gray-700">
          <InfoIcon aria-hidden="true" className="size-4 shrink-0" /><p>{t("paused")}</p>
        </aside>
      ) : null}
      {summary.isNegative ? (
        <aside role="note" className="flex items-start gap-2 rounded-lg bg-gold-50 px-4 py-3 type-body-sm text-gray-700">
          <InfoIcon aria-hidden="true" className="size-4 shrink-0" /><p>{t("negative")}</p>
        </aside>
      ) : null}

      {!summary.isPaused ? (
        <section aria-labelledby="loyalty-explanation-title" className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-8">
          <h2 id="loyalty-explanation-title" className="text-h3 font-bold text-gray-1000">{t("howItWorks.title")}</h2>
          <ul className="mt-4 space-y-4 type-body text-gray-600">
            {rules.map((rule) => <li key={rule} className="flex items-start gap-2"><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-gold-600" /><span className="min-w-0 break-words">{rule}</span></li>)}
          </ul>
        </section>
      ) : null}
    </>
  );
}
