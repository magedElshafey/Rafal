import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

export default async function AccountPage() {
  const locale = await getLocale();
  redirect({ href: "/account/profile", locale });
}
