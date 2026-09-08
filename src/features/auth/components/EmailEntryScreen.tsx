import { getTranslations } from "next-intl/server";

import AppLogo from "@/components/shared/AppLogo";
import { Button } from "@/components/ui/button";
import { AppleIcon, FacebookIcon, GoogleIcon } from "@/components/ui/icons";
import { InputField } from "@/components/ui/input";

const socialProviders = [
  { id: "apple", Icon: AppleIcon },
  { id: "google", Icon: GoogleIcon },
  { id: "facebook", Icon: FacebookIcon },
] as const;

export async function EmailEntryScreen() {
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

      <form className="flex flex-col gap-5">
        <InputField
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          label={t("email.label")}
          placeholder={t("email.placeholder")}
        />
        <Button type="button" size="lg" className="w-full">
          {t("email.continue")}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="type-body-sm text-gray-400">{t("email.or")}</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="flex flex-col gap-3">
        {socialProviders.map(({ Icon, id }) => (
          <button
            key={id}
            type="button"
            className="inline-flex h-11 w-full flex-row-reverse items-center justify-center gap-3 rounded-md border border-gray-200 bg-gray-0 type-body text-gray-1000 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Icon
              aria-hidden="true"
              className="size-5"
              variant={id === "apple" ? "monochrome" : "brand"}
            />
            {t(`email.social.${id}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
