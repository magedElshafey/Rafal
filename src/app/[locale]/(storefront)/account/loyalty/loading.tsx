import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";

export default async function LoyaltyLoading() {
  const t = await getTranslations("Account.loyalty");
  return (
    <div aria-busy="true" aria-label={t("loading")}>
      <h1 className="text-h2 font-bold text-gray-1000">{t("title")}</h1>
      <div className="mt-6 space-y-5">
        <div className="flex min-h-44 flex-col items-center justify-center rounded-lg bg-gray-1000 px-5 py-8 sm:px-8">
          <Skeleton className="size-6 bg-gray-700" />
          <Skeleton className="mt-2 h-10 w-40 bg-gray-700" />
          <Skeleton className="mt-2 h-4 w-32 bg-gray-700" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-8">
          <Skeleton className="h-7 w-48 max-w-full" />
          <div className="mt-4 space-y-4">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-5 w-full" />)}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-8">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-4 h-9 w-72 max-w-full" />
          {[0, 1, 2].map(index => <div key={index} className="flex min-h-24 items-center justify-between gap-4 border-b border-gray-200"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-6 w-20" /></div>)}
        </div>
      </div>
    </div>
  );
}
