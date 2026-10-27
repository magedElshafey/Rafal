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
      className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-gray-0 p-6 text-center sm:p-10">
      <div className={cn("mx-auto flex size-16 items-center justify-center rounded-full",
        state === "confirmed" ? "bg-success text-gray-0" : state === "failed" ? "bg-gray-100 text-destructive" : "bg-gold-50 text-gold-700")}>
        <Icon aria-hidden="true" className="size-8" />
      </div>
      <div role="status" aria-live="polite" aria-atomic="true">
        <h1 id="payment-result-title" className="mt-5 text-h2 font-bold text-gray-1000">{copy.states[state].title}</h1>
        <p className="mt-3 type-body text-gray-600">{copy.states[state].description}</p>
      </div>
      {paymentReturn && (
        <p className="mt-5 type-body font-medium text-gray-800">
          {copy.orderNumber}: <bdi className="break-all">{paymentReturn.orderNumber}</bdi>
        </p>
      )}
      {paymentReturn?.status === "failed" && state !== "confirmed" && state !== "failed" && (
        <p className="mt-3 type-body text-gray-600">{copy.reportedFailed}</p>
      )}
      <div className="mt-7 flex flex-col gap-3">
        {children}
        <Link prefetch={false} href={detailsHref ?? "/track-order"}
          className={cn(buttonVariants({ variant: "primary", size: "lg" }), "h-auto min-h-13 whitespace-normal py-3")}>
          {detailsHref ? copy.details : copy.lookup}
        </Link>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "md" })}>{copy.store}</Link>
        <Link href="/contact" className={buttonVariants({ variant: "ghost", size: "md" })}>{copy.support}</Link>
      </div>
    </section>
  );
}
