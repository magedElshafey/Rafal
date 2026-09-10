import type {
  Category,
  CategoryChild,
  CategoryChildDto,
  CategoryDto,
} from "@/features/categories/types";

export function mapCategoryChildDto(dto: CategoryChildDto): CategoryChild {
  return {
    id: dto.id,
    name: dto.name,
    slug: dto.slug,
    description: dto.description,
    imageUrl: dto.image_url,
    sortOrder: dto.sort_order,
  };
}

export function mapCategoryDto(dto: CategoryDto): Category {
  return {
    ...mapCategoryChildDto(dto),
    children: dto.children.map(mapCategoryChildDto),
  };
}
