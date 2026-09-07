import AnnouncmentBanner from "@/components/shell/storefront/announcment-banner/AnnouncmentBanner";
import Header from "@/components/shell/storefront/header/Header";
import type { ReactNode } from "react";

type StoreFontLayoutProps = {
  children: ReactNode;
};

export default async function StoreFontLayout({
  children,
}: StoreFontLayoutProps) {
  return (
    <>
      <Header />
      <AnnouncmentBanner message="test" dismissible={true} />
      <main>{children}</main>
    </>
  );
}
