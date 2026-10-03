"use client";

import { InfoIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  readCheckoutVerificationHandoff,
  type CheckoutVerificationHandoff,
} from "@/features/checkout/utils/checkout-handoff";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";

export type CheckoutVerificationCopy = {
  title: string;
  description: string;
  sentTo: string;
  orderNumber: string;
  foundation: string;
  missingTitle: string;
  missingDescription: string;
  returnToCheckout: string;
};

export function CheckoutVerificationHandoff({
  copy,
  orderNumber,
}: {
  copy: CheckoutVerificationCopy;
  orderNumber: string;
}) {
  const [context, setContext] = useState<
    CheckoutVerificationHandoff | null | undefined
  >(undefined);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setContext(readCheckoutVerificationHandoff(orderNumber));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [orderNumber]);

  if (context === undefined) {
    return <Skeleton className="mx-auto h-72 max-w-xl rounded-xl" />;
  }

  return (
    <section className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-gray-0 p-6 text-center sm:p-10">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-gold-50 text-gold-700">
        <InfoIcon aria-hidden="true" className="size-8" />
      </div>
      <h1 className="mt-5 text-h2 font-bold text-gray-1000">
        {context ? copy.title : copy.missingTitle}
      </h1>
      <p className="mx-auto mt-3 max-w-md type-body text-gray-600">
        {context ? copy.description : copy.missingDescription}
      </p>
      {context ? (
        <dl className="mt-6 space-y-3 border-t border-gray-200 pt-5 type-body">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-gray-500">{copy.orderNumber}</dt>
            <dd className="font-medium text-gray-1000">
              <bdi>{context.displayNumber}</bdi>
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-gray-500">{copy.sentTo}</dt>
            <dd className="font-medium text-gray-1000">
              <bdi dir="ltr">{context.email}</bdi>
            </dd>
          </div>
          <p className="pt-3 type-body-sm text-gray-500">{copy.foundation}</p>
        </dl>
      ) : null}
      {!context ? (
        <Link
          href="/checkout"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-gray-1000 px-5 type-body font-medium text-gray-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {copy.returnToCheckout}
        </Link>
      ) : null}
    </section>
  );
}
