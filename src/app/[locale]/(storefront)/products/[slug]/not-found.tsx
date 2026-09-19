import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";

export default async function ProductNotFound() {
  const t = await getTranslations("Common.productDetails.route");

  return (
    <Container className="main-content-spacing">
      <div className="flex flex-col items-center rounded-lg border border-gray-200 bg-gray-50 p-6 text-center sm:p-8">
        <h1 className="text-h3 font-bold text-gray-1000">
          {t("notFoundTitle")}
        </h1>
        <p className="mt-2 max-w-xl type-body text-gray-600">
          {t("notFoundDescription")}
        </p>
        <div className="mt-4">
          <Link href="/products" className={buttonVariants()}>
            {t("backToProducts")}
          </Link>
        </div>
      </div>
    </Container>
  );
}
