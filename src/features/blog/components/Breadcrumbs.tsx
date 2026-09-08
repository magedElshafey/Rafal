import { Link } from "@/i18n/navigation";

type BreadcrumbsProps = {
  blogLabel: string;
  current: string;
  homeLabel: string;
};

export function Breadcrumbs({ blogLabel, current, homeLabel }: BreadcrumbsProps) {
  return (
    <nav aria-label={blogLabel} className="type-body-sm text-gray-400">
      <ol className="flex flex-wrap items-center gap-2">
        <li><Link href="/" className="rounded-sm hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{homeLabel}</Link></li>
        <li aria-hidden="true">/</li>
        <li><Link href="/blog" className="rounded-sm hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{blogLabel}</Link></li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="max-w-full truncate">{current}</li>
      </ol>
    </nav>
  );
}
