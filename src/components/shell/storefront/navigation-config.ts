import {
  BellIcon,
  GridIcon,
  HeartIcon,
  HomeIcon,
  ShoppingBagIcon,
  UserIcon,
} from "@/components/ui/icons/interface-icons";

type NavigationMatch = "exact" | "prefix";

const navigationDestinations = {
  home: {
    href: "/",
    icon: HomeIcon,
    key: "home",
    match: "exact",
  },
  categories: {
    href: "/categories",
    icon: GridIcon,
    key: "categories",
    match: "prefix",
  },
  cart: {
    href: "/cart",
    icon: ShoppingBagIcon,
    key: "cart",
    match: "prefix",
  },
  wishlist: {
    href: "/wishlist",
    icon: HeartIcon,
    key: "wishlist",
    match: "exact",
  },
  offers: {
    href: "/offers",
    key: "offers",
    match: "prefix",
  },
  about: {
    href: "/about",
    key: "about_us",
    match: "prefix",
  },
  blogs: {
    href: "/blog",
    key: "blogs",
    match: "prefix",
  },
  notifications: {
    href: "/notifications",
    icon: BellIcon,
    key: "notifications",
    match: "prefix",
  },
  profile: {
    href: "/my-profile",
    icon: UserIcon,
    key: "profile",
    match: "prefix",
  },
} as const satisfies Record<
  string,
  {
    href: string;
    icon?: typeof HomeIcon;
    key: string;
    match: NavigationMatch;
  }
>;

export type ShellNavigationItem =
  (typeof navigationDestinations)[keyof typeof navigationDestinations];

export const primaryNavigationItems = [
  navigationDestinations.home,
  navigationDestinations.categories,
  navigationDestinations.offers,
  navigationDestinations.about,
  navigationDestinations.blogs,
] as const;

export const headerActionItems = [
  navigationDestinations.notifications,
  navigationDestinations.wishlist,
  navigationDestinations.cart,
  navigationDestinations.profile,
] as const;

export const mobileNavigationItems = [
  navigationDestinations.home,
  navigationDestinations.categories,
  navigationDestinations.cart,
  navigationDestinations.wishlist,
] as const;

export const moreNavigationItems = [
  navigationDestinations.offers,
  navigationDestinations.blogs,
  navigationDestinations.about,
] as const;

export function isNavigationItemActive(
  pathname: string,
  item: Pick<ShellNavigationItem, "href" | "match">,
) {
  return item.match === "exact"
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
