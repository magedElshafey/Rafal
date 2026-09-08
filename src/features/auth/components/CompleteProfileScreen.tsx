import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SaudiFlagIcon } from "@/components/ui/icons";
import { InputField, PhoneInputField } from "@/components/ui/input";

import { AuthBackLink } from "./AuthBackLink";

export async function CompleteProfileScreen() {
  const t = await getTranslations("Common.auth");

  return (
    <div className="flex flex-col">
      <AuthBackLink href="/login/verify" label={t("backToOtp")} />
      <header className="mt-5 mb-5 text-center">
        <h1 className="text-h2 font-bold text-gray-1000">
          {t("profile.title")}
        </h1>
        <p className="mt-1 type-body text-gray-600">
          {t("profile.description")}
        </p>
      </header>

      <form className="flex flex-col gap-4">
        <InputField
          id="first-name"
          name="firstName"
          autoComplete="given-name"
          required
          label={t("profile.firstName")}
          placeholder={t("profile.firstNamePlaceholder")}
        />
        <InputField
          id="last-name"
          name="lastName"
          autoComplete="family-name"
          required
          label={t("profile.lastName")}
          placeholder={t("profile.lastNamePlaceholder")}
        />
        <PhoneInputField
          id="mobile-number"
          name="phone"
          autoComplete="tel-national"
          required
          label={t("profile.mobile")}
          countryCode="+966"
          countryFlag={<SaudiFlagIcon className="size-full" />}
          placeholder={t("profile.mobilePlaceholder")}
        />

        <div className="mt-1 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Checkbox id="accept-terms" name="acceptTerms" required />
            <label
              htmlFor="accept-terms"
              className="cursor-pointer type-body-sm text-gray-600"
            >
              {t("profile.terms")}
            </label>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox id="marketing-opt-in" name="marketingOptIn" />
            <label
              htmlFor="marketing-opt-in"
              className="cursor-pointer type-body-sm text-gray-600"
            >
              {t("profile.marketing")}
            </label>
          </div>
        </div>

        <Button type="button" size="lg" className="mt-5 w-full">
          {t("profile.createAccount")}
        </Button>
      </form>
    </div>
  );
}
