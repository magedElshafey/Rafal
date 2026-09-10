import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { ContactForm } from "@/features/content/components/ContactForm";
import { PageIntro } from "@/components/shared/PageIntro";
import { getLocalizedAlternates } from "@/lib/seo/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({
    locale,
    namespace: "ContentPages.contact",
  });
  return {
    title: t("title"),
    description: t("description"),
    alternates: getLocalizedAlternates(locale, "/contact"),
  };
}

export default async function ContactPage() {
  const locale = await getLocale();
  const t = await getTranslations({
    locale,
    namespace: "ContentPages.contact",
  });
  const formKeys = [
    "title",
    "nameLabel",
    "namePlaceholder",
    "emailLabel",
    "emailPlaceholder",
    "subjectLabel",
    "subjectPlaceholder",
    "messageLabel",
    "messagePlaceholder",
    "submit",
    "notice",
  ] as const;
  const formCopy = Object.fromEntries(
    formKeys.map((key) => [key, t(`form.${key}`)]),
  ) as Record<(typeof formKeys)[number], string>;

  return (
    <Container size="default" className="pb-16 pt-4 md:pb-24 md:pt-8">
      <PageIntro title={t("title")} description={t("description")} />
      <div className="mt-9 grid items-start gap-6 md:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] md:mt-12">
        <ContactForm copy={formCopy} />
        <aside className="space-y-5">
          <section
            aria-labelledby="contact-info-title"
            className="rounded-lg bg-success p-6 text-gray-0"
          >
            <h2 id="contact-info-title" className="text-h3 font-bold">
              {t("info.title")}
            </h2>
            <dl className="mt-5 space-y-5 type-body-sm">
              <div>
                <dt className="text-gray-100">{t("info.phone")}</dt>
                <dd className="mt-1 font-bold" dir="ltr">
                  +966 11 000 0000
                </dd>
              </div>
              <div>
                <dt className="text-gray-100">{t("info.email")}</dt>
                <dd className="mt-1 font-bold" dir="ltr">
                  <a
                    href="mailto:support@rafal.sa"
                    className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-0"
                  >
                    support@rafal.sa
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-gray-100">{t("info.hours")}</dt>
                <dd className="mt-1 font-bold">{t("info.hoursValue")}</dd>
              </div>
            </dl>
          </section>
          <section
            aria-labelledby="quick-help-title"
            className="rounded-lg border border-gray-200 bg-gray-0 p-6"
          >
            <h2 id="quick-help-title" className="type-body-lg font-bold">
              {t("help.title")}
            </h2>
            <p className="mt-2 type-body text-gray-500">
              {t("help.description")}
            </p>
          </section>
        </aside>
      </div>
    </Container>
  );
}
