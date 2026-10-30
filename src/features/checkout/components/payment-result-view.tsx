import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { CheckIcon, ClockIcon, InfoIcon, XIcon } from "@/components/ui/icons";
import type { PaymentResultState, PaymentReturn } from "@/features/checkout/utils/payment-result";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type PaymentResultCopy = {
  states: Record<PaymentResultState, { title: string; description: string }>;
  orderNumber: string;
  reportedFailed: string;
  details: string;
  lookup: string;
  store: string;
  support: string;
  recheck: string;
};

export function PaymentResultView({ copy, state, paymentReturn, detailsHref, children }: {
  copy: PaymentResultCopy;
  state: PaymentResultState;
  paymentReturn: PaymentReturn | null;
  detailsHref?: string;
  children?: ReactNode;
}) {
  const Icon = state === "confirmed" ? CheckIcon : state === "failed" ? XIcon
    : state === "pending" || state === "checking" ? ClockIcon : InfoIcon;
  return (
    <section aria-labelledby="payment-result-title" data-payment-result={state}
      className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-gray-0 text-center">
      <div className="border-b border-gray-200 bg-gray-50 px-5 py-6 sm:px-10 sm:py-8">
        <div className={cn("mx-auto flex size-12 items-center justify-center rounded-lg border",
          state === "confirmed" ? "border-success/20 bg-success/10 text-success" : "border-gold-200 bg-gold-50 text-gold-700")}>
          <Icon aria-hidden="true" className="size-6" />
        </div>
        <div role="status" aria-live="polite" aria-atomic="true">
          <h1 id="payment-result-title" className="mt-4 text-h2 font-bold text-gray-1000 sm:text-h1">{copy.states[state].title}</h1>
          <p className="mx-auto mt-3 max-w-md text-pretty type-body-lg text-gray-600">{copy.states[state].description}</p>
        </div>
      </div>
      <div className="px-5 py-6 sm:px-10 sm:py-8">
        {paymentReturn && (
          <dl className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border border-gray-200 px-4 py-3 text-start">
            <dt className="type-body text-gray-600">{copy.orderNumber}</dt>
            <dd className="min-w-0 type-body-lg font-bold text-gray-900"><bdi className="break-all">{paymentReturn.orderNumber}</bdi></dd>
          </dl>
        )}
        {paymentReturn?.status === "failed" && state !== "confirmed" && state !== "failed" && (
          <p className="mt-3 type-body text-gray-600">{copy.reportedFailed}</p>
        )}
        <div className="mt-6 flex flex-col gap-3">
          {state !== "confirmed" && children}
          {state !== "failed" && <Link prefetch={false} href={detailsHref ?? "/track-order"}
            className={cn(buttonVariants({ variant: "primary", size: "lg" }), "h-auto min-h-13 whitespace-normal py-3")}>
            {detailsHref ? copy.details : copy.lookup}
          </Link>}
          <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-auto min-h-13 whitespace-normal py-3")}>{copy.store}</Link>
          {state === "confirmed" && children}
        </div>
        <div className="mt-4 border-t border-gray-200 pt-3">
          <Link href="/contact" className={cn(buttonVariants({ variant: "ghost", size: "md" }), "h-auto min-h-11 whitespace-normal text-gold-700 underline underline-offset-4")}>{copy.support}</Link>
        </div>
      </div>
    </section>
  );
}
