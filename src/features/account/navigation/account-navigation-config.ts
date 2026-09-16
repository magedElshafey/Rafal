import {
  CrownIcon,
  HeartIcon,
  MapPinIcon,
  ShoppingBagIcon,
  SlidersIcon,
  UserIcon,
} from "@/components/ui/icons";
import type { AccountNavigationKey } from "@/features/account/navigation/account-navigation.types";

export const accountNavigationItems = [
  { key: "profile", href: "/account/profile", icon: UserIcon },
  { key: "orders", href: "/account/orders", icon: ShoppingBagIcon },
  { key: "addresses", href: "/account/addresses", icon: MapPinIcon },
  { key: "wishlist", href: "/account/wishlist", icon: HeartIcon },
  { key: "loyalty", href: "/account/loyalty", icon: CrownIcon },
  { key: "settings", href: "/account/settings", icon: SlidersIcon },
] as const satisfies readonly {
  key: AccountNavigationKey;
  href?: string;
  icon: typeof UserIcon;
}[];
