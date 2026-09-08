import AppLogo from "@/components/shared/AppLogo";
import HeaderActions from "@/components/shell/storefront/header/HeaderActions";
import ListLinks from "@/components/shell/storefront/header/PrimaryNavigation";

import { Container } from "@/components/ui/container";

const Header = async () => {
  return (
    <header>
      <Container className="flex min-h-16 items-center justify-between gap-4 py-3 md:min-h-20 md:py-4">
        <div className="shrink-0">
          <AppLogo />
        </div>

        <ListLinks />

        <div className="shrink-0">
          <HeaderActions />
        </div>
      </Container>
    </header>
  );
};

export default Header;
