import { forwardRef } from "react";
import type { Icon, IconProps, IconWeight } from "@phosphor-icons/react/dist/lib/types";
import { ArrowLeftIcon as ArrowLeftSource } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowRightIcon as ArrowRightSource } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { BellIcon as BellSource } from "@phosphor-icons/react/dist/ssr/Bell";
import { CheckIcon as CheckSource } from "@phosphor-icons/react/dist/ssr/Check";
import { CaretDownIcon as ChevronDownSource } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretLeftIcon as ChevronLeftSource } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon as ChevronRightSource } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CrownIcon as CrownSource } from "@phosphor-icons/react/dist/ssr/Crown";
import { EyeIcon as EyeSource } from "@phosphor-icons/react/dist/ssr/Eye";
import { GridFourIcon as GridSource } from "@phosphor-icons/react/dist/ssr/GridFour";
import { HeadsetIcon as HeadsetSource } from "@phosphor-icons/react/dist/ssr/Headset";
import { HeartIcon as HeartSource } from "@phosphor-icons/react/dist/ssr/Heart";
import { HouseIcon as HomeSource } from "@phosphor-icons/react/dist/ssr/House";
import { InfoIcon as InfoSource } from "@phosphor-icons/react/dist/ssr/Info";
import { MapPinIcon as MapPinSource } from "@phosphor-icons/react/dist/ssr/MapPin";
import { DotsThreeIcon as MoreHorizontalSource } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { PlusIcon as PlusSource } from "@phosphor-icons/react/dist/ssr/Plus";
import { MagnifyingGlassIcon as SearchSource } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { ShieldCheckIcon as ShieldCheckSource } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { ShoppingBagIcon as ShoppingBagSource } from "@phosphor-icons/react/dist/ssr/ShoppingBag";
import { SlidersHorizontalIcon as SlidersSource } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { TruckIcon as TruckSource } from "@phosphor-icons/react/dist/ssr/Truck";
import { UserIcon as UserSource } from "@phosphor-icons/react/dist/ssr/User";
import { XIcon as XSource } from "@phosphor-icons/react/dist/ssr/X";

export interface RafalIconProps
  extends Omit<IconProps, "alt" | "color" | "weight"> {
  label?: string;
  weight?: IconWeight;
}

function createRafalIcon(Source: Icon, displayName: string) {
  const Component = forwardRef<SVGSVGElement, RafalIconProps>(
    ({ label, size = 24, weight = "regular", ...props }, ref) => (
      <Source
        ref={ref}
        {...props}
        size={size}
        weight={weight}
        color="currentColor"
        focusable="false"
        aria-hidden={label ? undefined : true}
        aria-label={label}
        role={label ? "img" : undefined}
      />
    ),
  );

  Component.displayName = displayName;
  return Component;
}

export const ArrowLeftIcon = createRafalIcon(ArrowLeftSource, "ArrowLeftIcon");
export const ArrowRightIcon = createRafalIcon(ArrowRightSource, "ArrowRightIcon");
export const ChevronLeftIcon = createRafalIcon(ChevronLeftSource, "ChevronLeftIcon");
export const ChevronRightIcon = createRafalIcon(ChevronRightSource, "ChevronRightIcon");
export const ChevronDownIcon = createRafalIcon(ChevronDownSource, "ChevronDownIcon");
export const SearchIcon = createRafalIcon(SearchSource, "SearchIcon");
export const ShoppingBagIcon = createRafalIcon(ShoppingBagSource, "ShoppingBagIcon");
export const HeartIcon = createRafalIcon(HeartSource, "HeartIcon");
export const UserIcon = createRafalIcon(UserSource, "UserIcon");
export const HomeIcon = createRafalIcon(HomeSource, "HomeIcon");
export const GridIcon = createRafalIcon(GridSource, "GridIcon");
export const CheckIcon = createRafalIcon(CheckSource, "CheckIcon");
export const XIcon = createRafalIcon(XSource, "XIcon");
export const InfoIcon = createRafalIcon(InfoSource, "InfoIcon");
export const MoreHorizontalIcon = createRafalIcon(
  MoreHorizontalSource,
  "MoreHorizontalIcon",
);
export const PlusIcon = createRafalIcon(PlusSource, "PlusIcon");
export const SlidersIcon = createRafalIcon(SlidersSource, "SlidersIcon");
export const BellIcon = createRafalIcon(BellSource, "BellIcon");
export const MapPinIcon = createRafalIcon(MapPinSource, "MapPinIcon");
export const TruckIcon = createRafalIcon(TruckSource, "TruckIcon");
export const CrownIcon = createRafalIcon(CrownSource, "CrownIcon");
export const ShieldCheckIcon = createRafalIcon(
  ShieldCheckSource,
  "ShieldCheckIcon",
);
export const HeadsetIcon = createRafalIcon(HeadsetSource, "HeadsetIcon");
export const EyeIcon = createRafalIcon(EyeSource, "EyeIcon");
