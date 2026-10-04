import type { Ref } from "react";
import type { Locale } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  OrderDetailsContent,
  OrderDetailsHeader,
  type OrderDetailsContentCopy,
} from "@/features/orders/components/order-details-content";
import type { OrderDetails } from "@/features/orders/types/order.types";

type GuestOrderResultProps = {
  changeDetailsLabel: string;
  copy: OrderDetailsContentCopy;
  headingRef: Ref<HTMLHeadingElement>;
  locale: Locale;
  onChangeDetails: () => void;
  order: OrderDetails;
};

export function GuestOrderResult({
  changeDetailsLabel,
  copy,
  headingRef,
  locale,
  onChangeDetails,
  order,
}: GuestOrderResultProps) {
  return (
    <div className="space-y-5">
      <OrderDetailsHeader
        copy={copy}
        headingRef={headingRef}
        locale={locale}
        order={order}
        actions={
          <Button variant="outline" onClick={onChangeDetails}>
            {changeDetailsLabel}
          </Button>
        }
      />
      <OrderDetailsContent copy={copy} locale={locale} order={order} />
    </div>
  );
}
