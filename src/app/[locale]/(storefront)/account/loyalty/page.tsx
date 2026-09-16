import { getLocale, getTranslations } from "next-intl/server";

import { CrownIcon } from "@/components/ui/icons";
import {
  LoyaltyHistory,
  type LoyaltyHistoryCopy,
} from "@/features/loyalty/components/loyalty-history";
import { getLoyaltyOverview } from "@/features/loyalty/server/loyalty-boundary";

export default async function AccountLoyaltyPage() {
  const [locale, overview, t] = await Promise.all([
    getLocale(),
    getLoyaltyOverview(),
    getTranslations("Account.loyalty"),
  ]);
  const numberFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  });
  const historyCopy: LoyaltyHistoryCopy = {
    title: t("history.title"),
    empty: t("history.empty"),
    order: t("history.order"),
    typeLabels: {
      earned: t("history.types.earned"),
      redeemed: t("history.types.redeemed"),
    },
    pointsLabels: {
      earned: (points) => t("history.points.earned", { points }),
      redeemed: (points) => t("history.points.redeemed", { points }),
    },
  };
  const howItWorksItems = [
    t("howItWorks.earning"),
    t("howItWorks.redemption"),
    t("howItWorks.programRules"),
    t("howItWorks.details"),
  ];

  return (
    <div>
      <h1 className="text-h2 font-bold text-gray-1000">{t("title")}</h1>

      <div className="mt-6 space-y-5">
        <section
          aria-labelledby="loyalty-balance-title"
          className="flex min-h-40 flex-col items-center justify-center rounded-lg bg-success px-6 py-8 text-center text-gray-0"
        >
          <CrownIcon aria-hidden="true" className="size-6" />
          <h2
            id="loyalty-balance-title"
            className="mt-2 max-w-full break-all text-display font-bold"
          >
            {t("balance.points", {
              points: numberFormatter.format(overview.account.pointsBalance),
            })}
          </h2>
          <p className="mt-2 type-body-sm">{t("balance.description")}</p>
        </section>

        <section
          aria-labelledby="loyalty-explanation-title"
          className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-8"
        >
          <h2
            id="loyalty-explanation-title"
            className="text-h3 font-bold text-gray-1000"
          >
            {t("howItWorks.title")}
          </h2>
          <ul className="mt-4 space-y-3 type-body-sm text-gray-500">
            {howItWorksItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold-500"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <LoyaltyHistory
          copy={historyCopy}
          locale={locale}
          transactions={overview.transactions}
        />
      </div>
    </div>
  );
}
