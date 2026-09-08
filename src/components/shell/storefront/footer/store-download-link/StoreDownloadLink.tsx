import { AppleIcon, GoogleIcon } from "@/components/ui/icons/brand-icons";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StoreKind = "app-store" | "google-play";

interface StoreDownloadLinkProps {
  eyebrow: string;
  href: string;
  name: string;
  store: StoreKind;
}

export default function StoreDownloadLink({
  eyebrow,
  href,
  name,
  store,
}: StoreDownloadLinkProps) {
  const StoreIcon = store === "app-store" ? AppleIcon : GoogleIcon;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      dir="ltr"
      className={cn(
        buttonVariants({ size: "md", variant: "outline" }),
        "w-full justify-start border-[#FFFFFF59] bg-transparent px-3 text-background",
      )}
    >
      <StoreIcon
        aria-hidden="true"
        variant="monochrome"
        className="size-5 shrink-0"
      />
      <span className="flex min-w-0 flex-col items-start leading-none">
        <span className="type-footer-store-eyebrow text-[#FFFFFFA6]">
          {eyebrow}
        </span>
        <span className="type-body font-bold text-background">{name}</span>
      </span>
    </a>
  );
}
