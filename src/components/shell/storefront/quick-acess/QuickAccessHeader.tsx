import { Container } from "@/components/ui/container";
import {
  LocationController,
  type LocationControllerCopy,
} from "@/features/location/components/LocationController";
import type { City, CityLocale } from "@/features/location/types";
import {
  SearchController,
  type SearchControllerCopy,
} from "@/features/search/components/SearchController";

type QuickAccessHeaderProps = {
  initialCity: City | null;
  locale: CityLocale;
  locationCopy: LocationControllerCopy;
  searchCopy: SearchControllerCopy;
};

function QuickAccessHeader({
  initialCity,
  locale,
  locationCopy,
  searchCopy,
}: QuickAccessHeaderProps) {
  return (
    <div className="bg-gray-0 md:bg-gray-50">
      <Container className="flex flex-col  md:flex-row md:items-center md:justify-between md:py-3">
        <div className="flex h-12 w-full items-center px-6 md:h-auto md:w-auto md:p-0">
          <LocationController
            copy={locationCopy}
            initialCity={initialCity}
            locale={locale}
          />
        </div>

        <div className="flex w-full items-center md:w-auto">
          <SearchController copy={searchCopy} locale={locale} />
        </div>
      </Container>
    </div>
  );
}

export default QuickAccessHeader;
export type { QuickAccessHeaderProps };
