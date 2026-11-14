"use client";

import { useTranslations, type Locale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { useLoyaltyHistory } from "../hooks/use-loyalty-history";
import { historyFilters, type LoyaltyHistoryPage } from "../types/loyalty-history.types";

export function LoyaltyHistory({ locale, initialPage }: { locale: Locale; initialPage: LoyaltyHistoryPage | null }) {
  const t = useTranslations("Account.loyalty.history");
  const state = useLoyaltyHistory(locale, initialPage);
  const dates = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Riyadh" });
  const numbers = new Intl.NumberFormat(locale, { signDisplay: "exceptZero" });
  return (
    <section aria-labelledby="loyalty-history-title" className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-8">
      <h2 id="loyalty-history-title" className="text-h3 font-bold text-gray-1000">{t("title")}</h2>
      <div role="group" aria-label={t("filterLabel")} className="mt-4 flex flex-wrap gap-2">
        {historyFilters.map(filter => <Button key={filter} size="sm" variant={state.filter === filter ? "secondary" : "ghost"} aria-pressed={state.filter === filter} onClick={() => state.changeFilter(filter)}>{t(`filters.${filter}`)}</Button>)}
      </div>
      <div aria-busy={state.loading}>
        {state.loading && !state.page ? <div className="mt-4" role="status" aria-label={t("loading")}>
          {[0, 1, 2].map(index => <div key={index} className="flex min-h-24 items-center justify-between gap-4 border-b border-gray-200"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-6 w-20" /></div>)}
        </div> : null}
        {state.page?.data.length ? <ol className="mt-4 divide-y divide-gray-200">
          {state.page.data.map(row => <li key={row.id} className="flex min-h-24 items-center justify-between gap-4 py-4 sm:gap-6">
            <div className="min-w-0 space-y-1">
              <p className="type-body font-medium text-gray-1000 break-words">{row.label}</p>
              {row.order ? <Link className="inline-block type-caption underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2" href={`/account/orders/${encodeURIComponent(row.order.order_number)}`}>{t("order")} <bdi>#{row.order.order_number}</bdi></Link> : null}
              <p className="type-caption text-gray-500"><time dateTime={row.created_at}>{dates.format(new Date(row.created_at))}</time></p>
              {row.is_pending ? <span className="inline-block rounded-md bg-gold-50 px-2 py-1 type-caption text-gray-1000">{t("pending")}</span> : null}
              {row.expires_at ? <p className="type-caption text-gray-500">{t("expires")} <time dateTime={row.expires_at}>{dates.format(new Date(row.expires_at))}</time></p> : null}
            </div>
            <span className={`max-w-[45%] shrink-0 break-all text-end type-body font-bold ${row.points > 0 ? "text-success" : row.points < 0 ? "text-destructive" : "text-gray-1000"}`}>
              <bdi>{numbers.format(row.points)}</bdi> {t("pointsUnit")}
            </span>
          </li>)}
        </ol> : null}
        {!state.loading && state.page?.meta.total === 0 && !state.outOfRange ? <p role="status" className="py-12 text-center type-body text-gray-500">{t("empty")}</p> : null}
      </div>
      {state.error ? <div className="mt-4 space-y-3" role="alert"><p className="type-body text-destructive">{t("error")}</p><Button variant="outline" onClick={state.loadMore}>{t("retry")}</Button></div> : null}
      {state.outOfRange ? <div className="mt-4 space-y-3" role="status"><p>{t("outOfRange")}</p><Button variant="outline" onClick={state.restart}>{t("restart")}</Button></div> : null}
      {state.hasMore && !state.error ? <div className="mt-5 flex justify-center"><Button variant="outline" loading={state.loading} loadingLabel={t("loading")} onClick={state.loadMore}>{t("showMore")}</Button></div> : null}
    </section>
  );
}
