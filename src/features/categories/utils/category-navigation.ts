import type { Category } from "@/features/categories/types";

export type CategoryNavigationLink = { id: number; name: string; href: string };
export type CategoryNavigationItem = CategoryNavigationLink & {
  children: CategoryNavigationLink[];
};

export type CategoryNavigationCopy = {
  title: string;
  viewAll: string;
  viewProducts: string;
  back: string;
  close: string;
};

export function mapCategoryNavigation(categories: readonly Category[]): CategoryNavigationItem[] {
  return categories.map((category) => {
    const href = `/categories/${encodeURIComponent(category.slug)}`;
    return {
      id: category.id,
      name: category.name,
      href,
      children: category.children.map((child) => ({
        id: child.id,
        name: child.name,
        href: `${href}?${new URLSearchParams({ subcategory: child.slug })}`,
      })),
    };
  });
}
