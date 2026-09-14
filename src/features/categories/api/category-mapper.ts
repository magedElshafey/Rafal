import type {
  Category,
  CategoryChild,
  CategoryChildDto,
  CategoryDto,
  CategoriesResponseDto,
  PaginatedCategories,
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

export function mapCategoriesResponseDto(
  response: CategoriesResponseDto,
): PaginatedCategories {
  return {
    items: response.data.map(mapCategoryDto),
    pagination: {
      current_page: response.current_page,
      last_page: response.last_page,
      per_page: response.per_page,
      total: response.total,
    },
  };
}
