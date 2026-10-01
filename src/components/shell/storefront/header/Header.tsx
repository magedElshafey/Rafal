import AppLogo from "@/components/shared/AppLogo";
import HeaderActions from "@/components/shell/storefront/header/HeaderActions";
import ListLinks from "@/components/shell/storefront/header/PrimaryNavigation";

import { Container } from "@/components/ui/container";
import type { CategoryNavigationItem } from "@/features/categories/utils/category-navigation";
import { Suspense } from "react";

const Header = ({ categories }: { categories: Promise<CategoryNavigationItem[]> }) => {
  return (
    <header className="bg-background">
      <Container className="relative flex min-h-16 items-center justify-between gap-4 py-3 md:min-h-20 md:py-4">
        <div className="shrink-0">
          <AppLogo />
        </div>

        <Suspense fallback={<ListLinks categories={[]} />}>
          <ListLinks categories={categories} />
        </Suspense>

        <div className="shrink-0">
          <HeaderActions />
        </div>
      </Container>
    </header>
  );
};

export default Header;
