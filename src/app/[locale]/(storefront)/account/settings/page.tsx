import { getLocale, getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { Switch } from "@/components/ui/switch";
import { appVersion } from "@/config/app-metadata";
import { logoutAccount } from "@/features/auth/actions/logout-account";
import {
  AccountPreferencesSection,
  type AccountPreferencesSectionCopy,
} from "@/features/account/settings/components/account-preferences-section";

export default async function AccountSettingsPage() {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("Account.settings"),
  ]);
  const preferencesCopy: AccountPreferencesSectionCopy = {
    title: t("notifications.title"),
    orderUpdates: {
      label: t("notifications.orderUpdates.label"),
      description: t("notifications.orderUpdates.description"),
    },
    offers: {
      label: t("notifications.offers.label"),
      description: t("notifications.offers.description"),
    },
  };

  return (
    <div>
      <h1 className="text-h2 font-bold text-gray-1000">{t("title")}</h1>

      <div className="mt-6 space-y-5">
        <AccountPreferencesSection copy={preferencesCopy} />

        <section
          aria-labelledby="account-security-title"
          className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-8"
        >
          <h2
            id="account-security-title"
            className="text-h3 font-bold text-gray-1000"
          >
            {t("security.title")}
          </h2>
          <div className="mt-4 flex min-h-16 items-center justify-between gap-5">
            <div className="min-w-0">
              <p className="type-body font-medium text-gray-1000">
                {t("security.biometric.label")}
              </p>
              <p
                id="biometric-description"
                className="mt-1 type-body-sm text-gray-400"
              >
                {t("security.biometric.description")}
              </p>
            </div>
            <Switch
              checked={false}
              disabled
              aria-label={t("security.biometric.label")}
              aria-describedby="biometric-description biometric-note"
            />
          </div>
          <p id="biometric-note" className="mt-3 type-body-sm text-gray-400">
            {t("security.biometric.note")}
          </p>
        </section>

        <section
          aria-labelledby="account-general-title"
          className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-8"
        >
          <h2
            id="account-general-title"
            className="text-h3 font-bold text-gray-1000"
          >
            {t("general.title")}
          </h2>

          <div className="mt-4 divide-y divide-gray-200">
            <div className="flex min-h-16 items-center justify-between gap-5 py-3">
              <span className="type-body font-medium text-gray-1000">
                {t("general.language")}
              </span>
              <LocaleSwitcher className="min-h-11 min-w-28 text-end type-body" />
            </div>

            <div className="flex min-h-16 items-center justify-between gap-5 py-3">
              <span className="type-body font-medium text-gray-1000">
                {t("general.version")}
              </span>
              <span className="type-body text-gray-400" dir="ltr">
                {appVersion}
              </span>
            </div>

            <form action={logoutAccount}>
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="flex min-h-16 w-full cursor-pointer items-center justify-between gap-5 py-3 text-start type-body font-medium text-gray-1000 outline-none transition-colors hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span>{t("general.logout")}</span>
                <ChevronLeftIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 ltr:rotate-180"
                />
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
