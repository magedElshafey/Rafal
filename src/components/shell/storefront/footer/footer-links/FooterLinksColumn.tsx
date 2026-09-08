import { Link } from "@/i18n/navigation";

import FooterTitle from "../footer-title/FooterTitle";

export interface FooterLinkItem {
  href: string;
  label: string;
}

interface FooterLinksColumnProps {
  id: string;
  links: readonly FooterLinkItem[];
  title: string;
}

export default function FooterLinksColumn({
  id,
  links,
  title,
}: FooterLinksColumnProps) {
  const titleId = `${id}-title`;

  return (
    <section className="min-w-0">
      <FooterTitle id={titleId}>{title}</FooterTitle>
      <nav aria-labelledby={titleId} className="mt-3.5">
        <ul className="space-y-3.5">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex rounded-sm  type-body text-gray-400 transition-colors hover:text-gray-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-gray-1000"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
