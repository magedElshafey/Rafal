"use client";

import type { Locale } from "next-intl";
import { useEffect, useState } from "react";

import { CheckIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  readCheckoutConfirmationHandoff,
  type CheckoutConfirmationHandoff,
} from "@/features/checkout/utils/checkout-handoff";
import { Link } from "@/i18n/navigation";

export type CheckoutConfirmationCopy = {
  title: string;
  orderNumber: string;
  description: string;
  shippingAddress: string;
  total: string;
  continueShopping: string;
  missingTitle: string;
  missingDescription: string;
};

function formatMoney(locale: Locale, amount: string, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(Number(amount));
}

export function CheckoutConfirmation({
  copy,
  locale,
  orderNumber,
}: {
  copy: CheckoutConfirmationCopy;
  locale: Locale;
  orderNumber: string;
}) {
  const [context, setContext] = useState<
    CheckoutConfirmationHandoff | null | undefined
  >(undefined);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setContext(readCheckoutConfirmationHandoff(orderNumber));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [orderNumber]);

  if (context === undefined) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-gray-0 p-6 sm:p-10">
        <Skeleton className="mx-auto size-16 rounded-full" />
        <Skeleton className="mx-auto mt-5 h-8 w-64" />
        <Skeleton className="mx-auto mt-4 h-4 w-40" />
      </div>
    );
  }

  if (!context) {
    return (
      <section className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-gray-0 p-6 text-center sm:p-10">
        <h1 className="text-h2 font-bold text-gray-1000">
          {copy.missingTitle}
        </h1>
        <p className="mt-3 type-body text-gray-600">
          {copy.missingDescription}
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-gray-1000 px-5 type-body font-medium text-gray-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {copy.continueShopping}
        </Link>
      </section>
    );
  }

  const address = context.shippingAddress;
  const separator = locale === "ar" ? "، " : ", ";

  return (
    <section className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-gray-0 p-6 text-center sm:p-10">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success text-gray-0">
        <CheckIcon aria-hidden="true" className="size-8" />
      </div>
      <h1 className="mt-5 text-h2 font-bold text-gray-1000">{copy.title}</h1>
      <p className="mt-3 type-body font-medium text-success">
        {copy.orderNumber}: <bdi>{context.displayNumber}</bdi>
      </p>
      <p className="mx-auto mt-5 max-w-md type-body text-gray-600">
        {copy.description}
      </p>

      <dl className="mt-6 grid gap-4 border-t border-gray-200 pt-5 text-start type-body sm:grid-cols-[auto_1fr]">
        <dt className="text-gray-500">{copy.shippingAddress}</dt>
        <dd className="font-medium text-gray-800 sm:text-end">
          {[
            address.recipientName,
            address.city?.name,
            address.district,
            address.streetDetails,
          ]
            .filter((part) => typeof part === "string" && part.length > 0)
            .join(separator)}
        </dd>
        <dt className="text-gray-500">{copy.total}</dt>
        <dd className="font-bold text-gray-1000 sm:text-end">
          <bdi>
            {formatMoney(locale, context.money.total, context.money.currency)}
          </bdi>
        </dd>
      </dl>

      <Link
        href="/products"
        className="mt-7 inline-flex min-h-12 items-center justify-center rounded-md bg-gray-1000 px-7 type-body font-medium text-gray-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {copy.continueShopping}
      </Link>
    </section>
  );
}
