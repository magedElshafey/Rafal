import "server-only";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { SafeHtml } from "@/components/ui/safe-html";
import type { StaticPage } from "../types";
import styles from "./static-page.module.css";

export async function StaticPageScreen({
  page,
  locale,
}: {
  page: StaticPage;
  locale: Locale;
}) {
  const t = await getTranslations({
    locale,
    namespace: "ContentPages.staticPages",
  });
  return (
    <article className="pb-12 md:pb-16">
      <header className="border-b border-gold-100 bg-gold-50/50 py-8 md:py-12">
        <Container>
          <Breadcrumbs
            className="text-gray-600"
            label={t("breadcrumbs")}
            items={[{ label: t("home"), href: "/" }, { label: page.title }]}
          />
          <h1 className="mt-6 text-h1 font-bold text-foreground break-words">
            {page.title}
          </h1>
        </Container>
      </header>
      <Container className="mt-8 md:mt-10">
        <div className="rounded-lg border border-border bg-background p-5 sm:p-8">
          {page.hasMeaningfulContent ? (
            <SafeHtml
              html={page.contentHtml}
              policy="static-page"
              className={styles.content}
            />
          ) : (
            <EmptyState
              role="status"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
            />
          )}
        </div>
      </Container>
    </article>
  );
}
