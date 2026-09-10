import Image from "next/image";

import type { Category } from "@/features/categories/types";
import { Link } from "@/i18n/navigation";

type CategoryCardProps = {
  category: Category;
};

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="me-auto flex w-22 md:w-30 flex-col items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="relative size-22 md:size-30 overflow-hidden rounded-full bg-gray-100">
        <Image
          fill
          alt={category.name}
          className="object-cover"
          sizes="120px"
          src={category.imageUrl}
        />
      </span>
      <span className="mt-3 text-center text-sm text-foreground">
        {category.name}
      </span>
    </Link>
  );
}
