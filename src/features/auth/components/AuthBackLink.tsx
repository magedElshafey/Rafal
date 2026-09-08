import { ArrowLeftIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";

type AuthBackLinkProps = {
  href: "/login" | "/login/verify";
  label: string;
};

export function AuthBackLink({ href, label }: AuthBackLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex size-8 self-start items-center justify-center rounded-md text-gray-700 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rtl:self-end"
    >
      <ArrowLeftIcon aria-hidden="true" className="size-4 rtl:rotate-180" />
    </Link>
  );
}
