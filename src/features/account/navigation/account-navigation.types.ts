export type AccountNavigationKey =
  | "profile"
  | "orders"
  | "addresses"
  | "wishlist"
  | "loyalty"
  | "settings";

export type AccountNavigationCopy = {
  label: string;
  logout: string;
  unavailable: string;
  items: Record<AccountNavigationKey, string>;
};
