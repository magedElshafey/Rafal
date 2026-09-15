import type { Locale } from "next-intl";

import type { OrderAddress as OrderAddressData } from "@/features/orders/types/order.types";

type OrderAddressProps = {
  address: OrderAddressData;
  locale: Locale;
  title: string;
};

export function OrderAddress({ address, locale, title }: OrderAddressProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-7">
      <h2 className="text-h4 font-bold text-gray-1000">{title}</h2>
      <address className="mt-4 type-body text-gray-500 not-italic">
        <span className="font-medium text-gray-700">{address.recipientName}</span>
        {" — "}
        {[
          address.city,
          address.district,
          address.street,
          address.building,
        ].join(locale === "ar" ? "، " : ", ")}
      </address>
    </section>
  );
}
