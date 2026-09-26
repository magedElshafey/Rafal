import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";

import { CompleteProfileForm } from "./CompleteProfileForm";

type CompleteProfileScreenProps = { locale: Locale; returnTo: string };

export async function CompleteProfileScreen({
  locale,
  returnTo,
}: CompleteProfileScreenProps) {
  const t = await getTranslations("Common.auth");

  return (
    <div className="flex flex-col">
      <header className="mt-5 mb-5 text-center">
        <h1 className="text-h2 font-bold text-gray-1000">
          {t("profile.title")}
        </h1>
        <p className="mt-1 type-body text-gray-600">
          {t("profile.description")}
        </p>
      </header>

      <CompleteProfileForm
        locale={locale}
        returnTo={returnTo}
        copy={{
          firstName: t("profile.firstName"),
          firstNamePlaceholder: t("profile.firstNamePlaceholder"),
          lastName: t("profile.lastName"),
          lastNamePlaceholder: t("profile.lastNamePlaceholder"),
          phone: t("profile.mobile"),
          phonePlaceholder: t("profile.mobilePlaceholder"),
          terms: t("profile.terms"),
          submit: t("profile.createAccount"),
          submitting: t("profile.submitting"),
          required: t("errors.required"),
          invalidField: t("errors.invalidField"),
          invalidPhone: t("errors.invalidPhone"),
          termsRequired: t("errors.termsRequired"),
          unavailable: t("errors.serviceUnavailable"),
        }}
      />
    </div>
  );
}
