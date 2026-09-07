import AnnouncmentBanner from "@/components/shell/storefront/announcment-banner/AnnouncmentBanner";
import Footer from "@/components/shell/storefront/footer/Footer";
import Header from "@/components/shell/storefront/header/Header";
import MobileBottomNavigation from "@/components/shell/storefront/mobile-navigation/MobileBottomNavigation";
import type { ReactNode } from "react";

type StoreFontLayoutProps = {
  children: ReactNode;
};

export default async function StoreFontLayout({
  children,
}: StoreFontLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col pb-[calc(var(--mobile-bottom-navigation-height)+env(safe-area-inset-bottom))] md:pb-0">
      <Header />
      <AnnouncmentBanner
        message="شحن مجاني للطلبات فوق ٢٠٠ ر.س"
        dismissible={true}
      />
      <main className="flex-1">{children}</main>
      <Footer />
      <MobileBottomNavigation />
    </div>
  );
}
