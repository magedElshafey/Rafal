import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";

import { AuthBackLink } from "./AuthBackLink";
import { OtpVerificationForm } from "./OtpVerificationForm";

type OtpVerificationScreenProps = { locale: Locale; returnTo: string };

export async function OtpVerificationScreen({
  locale,
  returnTo,
}: OtpVerificationScreenProps) {
  const t = await getTranslations("Common.auth");

  return (
    <div className="flex flex-col">
      <AuthBackLink href="/login" label={t("backToEmail")} returnTo={returnTo} />
      <header className="mt-8 text-center">
        <h1 className="text-h2 font-bold text-gray-1000">{t("otp.title")}</h1>
        <p className="mt-1 type-body text-gray-600">
          {t("otp.description")}
        </p>
      </header>
      <OtpVerificationForm
        locale={locale}
        returnTo={returnTo}
        copy={{
          label: t("otp.label"),
          submit: t("otp.verify"),
          submitting: t("otp.submitting"),
          invalidCode: t("errors.invalidCode"),
          unavailable: t("errors.serviceUnavailable"),
        }}
      />
    </div>
  );
}
