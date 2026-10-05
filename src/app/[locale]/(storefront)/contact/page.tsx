import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { ContactForm } from "@/features/content/components/ContactForm";
import type { ContactFormCopy } from "@/features/contact/types/contact-message.types";
import { PageIntro } from "@/components/shared/PageIntro";
import { getLocalizedAlternates } from "@/lib/seo/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "ContentPages.contact" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: getLocalizedAlternates(locale, "/contact"),
  };
}

export default async function ContactPage() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "ContentPages.contact" });
  const formCopy: ContactFormCopy = {
    title: t("form.title"),
    required: t("form.required"),
    labels: {
      name: t("form.labels.name"), email: t("form.labels.email"),
      phone: t("form.labels.phone"), subject: t("form.labels.subject"), message: t("form.labels.message"),
    },
    validation: {
      name: t("form.validation.name"), email: t("form.validation.email"),
      phone: t("form.validation.phone"), subject: t("form.validation.subject"), message: t("form.validation.message"),
    },
    submit: t("form.submit"),
    submitting: t("form.submitting"),
    successTitle: t("form.successTitle"),
    successBody: t("form.successBody"),
    sendAnother: t("form.sendAnother"),
    errors: {
      "validation-error": t("form.errors.validation"),
      "rate-limited": t("form.errors.rateLimited"),
      "service-failure": t("form.errors.serviceFailure"),
    },
  };

  return (
    <Container size="default" className="main-content-spacing">
      <PageIntro title={t("title")} description={t("description")} />
      <div className="mt-9 grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] md:mt-12">
        <ContactForm copy={formCopy} />
        <aside className="min-w-0 space-y-5">
          <section
            aria-labelledby="contact-info-title"
            className="rounded-lg bg-success p-6 text-gray-0"
          >
            <h2 id="contact-info-title" className="text-h3 font-bold">
              {t("support.title")}
            </h2>
            <p className="mt-5 type-body-sm">{t("support.description")}</p>
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
