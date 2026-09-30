import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function AboutRedirect() {
  redirect({ href: "/about-us", locale: await getLocale() });
}
