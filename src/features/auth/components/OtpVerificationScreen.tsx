import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

import { AuthBackLink } from "./AuthBackLink";
import { OtpInput } from "./OtpInput";
import { ResendCountdown } from "./ResendCountdown";

export async function OtpVerificationScreen() {
  const t = await getTranslations("Common.auth");

  return (
    <div className="flex flex-col">
      <AuthBackLink href="/login" label={t("backToEmail")} />
      <header className="mt-8 text-center">
        <h1 className="text-h2 font-bold text-gray-1000">{t("otp.title")}</h1>
        <p className="mt-1 type-body text-gray-600">
          {t("otp.description")}
          <br />
          <bdi>{t("otp.demoEmail")}</bdi>
        </p>
      </header>

      <form className="mt-7 flex flex-col">
        <label htmlFor="auth-otp" className="sr-only">
          {t("otp.label")}
        </label>
        <OtpInput
          id="auth-otp"
          name="otp"
          required
          aria-describedby="auth-otp-resend"
        />
        <div id="auth-otp-resend" className="mt-5 flex min-h-5 justify-center">
          <ResendCountdown
            countdownLabel={t("otp.resendCountdown")}
            resendLabel={t("otp.resend")}
          />
        </div>
        <Button type="button" size="lg" className="mt-10 w-full">
          {t("otp.verify")}
        </Button>
      </form>
    </div>
  );
}
