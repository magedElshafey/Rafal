import type { Locale } from "next-intl";

import type { OrderDetails } from "@/features/orders/types/order.types";
import { formatSaudiMobileForDisplay } from "@/lib/phone/saudi-mobile";

type OrderAddressProps = {
  address: OrderDetails["shippingAddress"];
  addressLabel: string;
  locale: Locale;
  phoneLabel: string;
  recipientLabel: string;
  shippingMethod: OrderDetails["shippingMethod"];
  shippingMethodLabel: string;
  title: string;
};

export function OrderAddress({
  address,
  addressLabel,
  locale,
  phoneLabel,
  recipientLabel,
  shippingMethod,
  shippingMethodLabel,
  title,
}: OrderAddressProps) {
  const addressParts = [
    address.city?.name,
    address.district,
    address.streetDetails,
  ].filter((part): part is string => Boolean(part));

  return (
    <section className="h-full rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-7">
      <h2 className="text-h4 font-bold text-gray-1000">{title}</h2>
      <dl className="mt-4 space-y-3 type-body">
        <div>
          <dt className="type-caption text-gray-500">{recipientLabel}</dt>
          <dd className="mt-1 font-medium text-gray-800">
            {address.recipientName}
          </dd>
        </div>
        {addressParts.length > 0 ? (
          <div>
            <dt className="type-caption text-gray-500">{addressLabel}</dt>
            <dd className="mt-1 text-gray-700">
              {addressParts.join(locale === "ar" ? "، " : ", ")}
            </dd>
          </div>
        ) : null}
        {address.recipientPhone ? (
          <div>
            <dt className="type-caption text-gray-500">{phoneLabel}</dt>
            <dd className="mt-1 text-gray-700">
              <bdi dir="ltr">
                {formatSaudiMobileForDisplay(address.recipientPhone)}
              </bdi>
            </dd>
          </div>
        ) : null}
        {shippingMethod?.name ? (
          <div>
            <dt className="type-caption text-gray-500">
              {shippingMethodLabel}
            </dt>
            <dd className="mt-1 text-gray-700">{shippingMethod.name}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
