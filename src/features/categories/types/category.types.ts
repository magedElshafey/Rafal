export type CategoryChildDto = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string;
  sort_order: number;
};

export type CategoryDto = CategoryChildDto & {
  children: CategoryChildDto[];
};

export type CategoriesResponseDto = {
  success: boolean;
  message: string;
  data: CategoryDto[];
};

export type CategoryResponseDto = {
  success: boolean;
  message: string;
  data: CategoryDto;
};

export type CategoryChild = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string;
  sortOrder: number;
};

export type Category = CategoryChild & {
  children: CategoryChild[];
};
