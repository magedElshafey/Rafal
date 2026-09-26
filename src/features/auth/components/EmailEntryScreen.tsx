import { getTranslations } from "next-intl/server";

import AppLogo from "@/components/shared/AppLogo";
import type { Locale } from "next-intl";

import { EmailEntryForm } from "./EmailEntryForm";

type EmailEntryScreenProps = {
  locale: Locale;
  notice?: string;
  returnTo: string;
};

export async function EmailEntryScreen({
  locale,
  notice,
  returnTo,
}: EmailEntryScreenProps) {
  const t = await getTranslations("Common.auth");

  return (
    <div className="flex flex-col pt-10">
      <div className="mb-10 text-center">
        <AppLogo
          aria-label={t("brandHome")}
          className="text-2xl tracking-[3px]"
        />
      </div>
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">
          {t("email.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-600">{t("email.description")}</p>
      </header>

      {notice ? (
        <p role="status" className="mb-5 rounded-md bg-gold-50 p-3 type-body-sm text-gray-700">
          {notice}
        </p>
      ) : null}
      <EmailEntryForm
        locale={locale}
        returnTo={returnTo}
        copy={{
          label: t("email.label"),
          placeholder: t("email.placeholder"),
          submit: t("email.continue"),
          submitting: t("email.submitting"),
          invalidEmail: t("errors.invalidEmail"),
          unavailable: t("errors.serviceUnavailable"),
        }}
      />
    </div>
  );
}
