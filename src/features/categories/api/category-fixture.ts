import type { CategoriesResponseDto } from "@/features/categories/types";

// Temporary development fixture mirroring the documented Laravel response.
// Local crops from the approved Home design are used while storage is unavailable.
export const categoriesFixture = {
  success: true,
  message: "Categories retrieved successfully",
  data: [
    {
      id: 1,
      name: "مباخر بالاسم",
      slug: "personalized",
      description: null,
      image_url: "/images/categories/personalized.png",
      sort_order: 1,
      children: [],
    },
    {
      id: 2,
      name: "عطور",
      slug: "perfumes",
      description: null,
      image_url: "/images/categories/perfumes.png",
      sort_order: 2,
      children: [],
    },
    {
      id: 3,
      name: "اكسسوارات سيارات",
      slug: "car-accessories",
      description: null,
      image_url: "/images/categories/car-accessories.png",
      sort_order: 3,
      children: [],
    },
    {
      id: 4,
      name: "هدايا رجالية",
      slug: "mens-gifts",
      description: null,
      image_url: "/images/categories/mens-gifts.png",
      sort_order: 4,
      children: [],
    },
    {
      id: 5,
      name: "مجوهرات نسائية",
      slug: "womens-jewelry",
      description: null,
      image_url: "/images/categories/womens-jewelry.png",
      sort_order: 5,
      children: [],
    },
  ],
} satisfies CategoriesResponseDto;
