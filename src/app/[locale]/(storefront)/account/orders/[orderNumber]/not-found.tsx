import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Link } from "@/i18n/navigation";

export default async function OrderDetailsNotFound() {
  const t = await getTranslations("Account.orders.details");

  return (
    <ErrorState
      title={t("notFound.title")}
      description={t("notFound.description")}
      action={
        <Link
          href="/account/orders"
          className={buttonVariants({ size: "md", variant: "primary" })}
        >
          {t("backToOrders")}
        </Link>
      }
    />
  );
}
