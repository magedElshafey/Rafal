"use client";

import { ChangeEvent, useTransition } from "react";
import { hasLocale, useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const localeLabels = {
  ar: "العربية",
  en: "English",
} satisfies Record<(typeof routing.locales)[number], string>;

type LocaleSwitcherProps = {
  className?: string;
};

export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const locale = useLocale();
  const t = useTranslations("Common.LocaleSwitcher");

  const pathname = usePathname();
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  function handleLocaleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value;

    if (!hasLocale(routing.locales, nextLocale)) {
      return;
    }

    if (nextLocale === locale) {
      return;
    }

    const href = `${pathname}${window.location.search}${window.location.hash}`;

    startTransition(() => {
      router.replace(href, {
        locale: nextLocale,
        scroll: false,
      });
    });
  }

  return (
    <select
      aria-label={t("label")}
      value={locale}
      onChange={handleLocaleChange}
      disabled={isPending}
      className={cn(
        "cursor-pointer rounded-sm bg-transparent text-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait",
        className,
      )}
    >
      {routing.locales.map((localeOption) => (
        <option key={localeOption} value={localeOption}>
          {localeLabels[localeOption]}
        </option>
      ))}
    </select>
  );
}
