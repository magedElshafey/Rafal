import type { Locale } from "next-intl";

import { VariantAttributeValue } from "@/components/ui/variant-attribute-value";
import type { OrderDetails } from "@/features/orders/types/order.types";
import { formatOrderMoney } from "@/features/orders/utils/order-formatters";
import {
  getVariantAttributeEntries,
  getVariantAttributeLabel,
} from "@/lib/variant-attributes";

type OrderItemsProps = {
  attributeLabels: Readonly<Record<string, string>>;
  currency: string;
  items: OrderDetails["items"];
  locale: Locale;
  quantityLabel: (count: number) => string;
  title: string;
  unitPriceLabel: string;
};

export function OrderItems({
  attributeLabels,
  currency,
  items,
  locale,
  quantityLabel,
  title,
  unitPriceLabel,
}: OrderItemsProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-7">
      <h2 className="text-h4 font-bold text-gray-1000">{title}</h2>
      <ul className="mt-3 divide-y divide-gray-200">
        {items.map((item) => {
          const attributes = getVariantAttributeEntries(item.variantAttributes);

          return (
            <li
              key={item.id}
              className="flex min-w-0 flex-col gap-3 py-4 first:pt-2 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <h3 className="type-body font-bold text-gray-1000">
                  {item.productName}
                </h3>
                {attributes.length > 0 ? (
                  <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 type-caption text-gray-500">
                    {attributes.map(([name, value]) => (
                      <div key={name} className="flex gap-1">
                        <dt className="font-medium">
                          {getVariantAttributeLabel(name, attributeLabels)}:
                        </dt>
                        <dd className="flex items-center">
                          <VariantAttributeValue
                            attributeKey={name}
                            attributeValue={value}
                          />
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                <p className="mt-1.5 type-body-sm text-gray-600">
                  {quantityLabel(item.quantity)}
                </p>
              </div>
              <div className="shrink-0 sm:text-end">
                <p className="type-body font-bold text-gray-1000">
                  <bdi>{formatOrderMoney(locale, item.lineTotal, currency)}</bdi>
                </p>
                <p className="mt-1 type-caption text-gray-500">
                  {unitPriceLabel}: {" "}
                  <bdi>
                    {formatOrderMoney(locale, item.unitPrice, currency)}
                  </bdi>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
