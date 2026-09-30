import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("ContentPages.staticPages");
  return (
    <Container size="narrow" className="main-content-spacing">
      <div className="rounded-lg border border-border bg-gray-50 p-6 text-center sm:p-8">
        <h1 className="text-h1 font-bold">{t("notFoundTitle")}</h1>
        <p className="mt-3 type-body-lg text-gray-600">{t("notFoundDescription")}</p>
        <Link href="/" className={buttonVariants({ className: "mt-6" })}>{t("backHome")}</Link>
      </div>
    </Container>
  );
}
