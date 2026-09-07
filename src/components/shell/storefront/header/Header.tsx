import AppLogo from "@/components/shared/AppLogo";
import ListLinks from "@/components/shell/storefront/header/ListLinks";
import { Container } from "@/components/ui/container";

const Header = () => {
  return (
    <Container className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 2xl:gap-7">
      <div className="shrink-0">
        <AppLogo />
      </div>
      <div className="flex-1">
        <ListLinks />
      </div>
    </Container>
  );
};

export default Header;
