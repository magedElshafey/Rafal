import { getStaticPageMetadata, StaticPageRoute } from "@/features/static-pages/static-page-route";

export function generateMetadata() {
  return getStaticPageMetadata("returns");
}

export default function Page() {
  return <StaticPageRoute pageKey="returns" />;
}
