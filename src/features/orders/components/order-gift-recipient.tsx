import type { Locale } from "next-intl";

import type { OrderGiftSnapshot } from "@/features/orders/types/order.types";

type OrderGiftRecipientProps = {
  gift: OrderGiftSnapshot;
  labels: {
    address: string;
    message: string;
    phone: string;
    title: string;
  };
  locale: Locale;
};

export function OrderGiftRecipient({
  gift,
  labels,
  locale,
}: OrderGiftRecipientProps) {
  const separator = locale === "ar" ? "، " : ", ";

  return (
    <section className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-7">
      <h2 className="text-h4 font-bold text-gray-1000">{labels.title}</h2>
      <dl className="mt-4 grid gap-4 type-body sm:grid-cols-2">
        <div>
          <dt className="text-gray-500">{labels.address}</dt>
          <dd className="mt-1 text-gray-700">
            <span className="font-medium">{gift.recipientName}</span>
            {" — "}
            {[gift.city, gift.district, gift.streetDetails].join(separator)}
          </dd>
        </div>
        {gift.recipientPhone ? (
          <div>
            <dt className="text-gray-500">{labels.phone}</dt>
            <dd className="mt-1 font-medium text-gray-700">
              <bdi>{gift.recipientPhone}</bdi>
            </dd>
          </div>
        ) : null}
        {gift.giftMessage ? (
          <div className="sm:col-span-2">
            <dt className="text-gray-500">{labels.message}</dt>
            <dd className="mt-1 text-gray-700">{gift.giftMessage}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
