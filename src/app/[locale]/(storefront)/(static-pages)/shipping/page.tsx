import { getStaticPageMetadata, StaticPageRoute } from "@/features/static-pages/static-page-route";

export function generateMetadata() {
  return getStaticPageMetadata("shipping");
}

export default function Page() {
  return <StaticPageRoute pageKey="shipping" />;
}
