import Image from "next/image";
import type { Locale } from "next-intl";

import type { OrderItem } from "@/features/orders/types/order.types";
import { formatOrderMoney } from "@/features/orders/utils/order-formatters";

type OrderItemsProps = {
  currency: "SAR";
  items: OrderItem[];
  locale: Locale;
  quantityLabel: (count: number) => string;
  title: string;
};

export function OrderItems({
  currency,
  items,
  locale,
  quantityLabel,
  title,
}: OrderItemsProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-7">
      <h2 className="text-h4 font-bold text-gray-1000">{title}</h2>
      <ul className="mt-4 divide-y divide-gray-200">
        {items.map((item) => {
          const name = item.name[locale];

          return (
            <li
              key={item.id}
              className="flex min-w-0 items-center gap-4 py-4 first:pt-0 last:pb-0"
            >
              <Image
                src={item.imageUrl}
                alt={name}
                width={64}
                height={64}
                sizes="64px"
                className="size-16 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <h3 className="type-body font-bold text-gray-1000">{name}</h3>
                {item.details.map((detail) => (
                  <p
                    key={detail[locale]}
                    className="mt-0.5 type-caption text-gray-500"
                  >
                    {detail[locale]}
                  </p>
                ))}
                <p className="mt-1 type-body-sm text-gray-600">
                  {quantityLabel(item.quantity)}
                </p>
              </div>
              <p className="shrink-0 type-body font-bold text-gray-1000">
                <bdi>{formatOrderMoney(locale, item.unitPrice, currency)}</bdi>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
