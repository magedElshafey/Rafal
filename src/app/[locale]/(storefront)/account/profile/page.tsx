import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { getAccountProfile } from "@/features/account/profile/api/get-account-profile";
import {
  ProfileForm,
  type ProfileFormCopy,
} from "@/features/account/profile/components/profile-form";
// import { ProfileLoyaltySummary } from "@/features/account/profile/components/profile-loyalty-summary";
// import { getLoyaltyAccount } from "@/features/loyalty/server/loyalty-boundary";

type AccountProfilePageProps = {
  params: Promise<{ locale: Locale }>;
};

export default async function AccountProfilePage({
  params,
}: AccountProfilePageProps) {
  const [{ locale }, profile, t] = await Promise.all([
    params,
    getAccountProfile(),
    // getLoyaltyAccount(),
    // getLocale(),
    getTranslations("Account.profile"),
  ]);
  // const numberFormatter = new Intl.NumberFormat(locale, {
  //   maximumFractionDigits: 0,
  // });
  const formCopy: ProfileFormCopy = {
    title: t("title"),
    firstName: t("fields.firstName"),
    lastName: t("fields.lastName"),
    email: t("fields.email"),
    phone: t("fields.phone"),
    save: t("save"),
    saving: t("saving"),
    saved: t("saved"),
    saveError: t("saveError"),
    validation: {
      required: t("validation.required"),
      phone: t("validation.phone"),
      invalid: t("validation.invalid"),
    },
  };

  return (
    <div className="space-y-6">
      <ProfileForm copy={formCopy} locale={locale} profile={profile} />
      {/* <ProfileLoyaltySummary
        title={t("loyalty.title", {
          points: numberFormatter.format(loyaltyAccount.pointsBalance),
        })}
        description={t("loyalty.description")}
      /> */}
    </div>
  );
}
