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
    <div className="bg-gray-50 py-3 border-b border-b-gray-200">
      <Container className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
        <div className="flex w-full items-center md:w-auto">
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
