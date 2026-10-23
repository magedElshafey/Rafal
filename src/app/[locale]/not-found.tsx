import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("Common.feedback");
  return (
    <Container className="py-12">
      <ErrorState title={t("notFoundTitle")} description={t("notFoundDescription")}
        action={<Link href="/" className="inline-flex min-h-11 items-center rounded-md px-4 text-gold-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500">{t("home")}</Link>} />
    </Container>
  );
}
