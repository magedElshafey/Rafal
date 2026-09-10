import type { BannersResponseDto } from "@/features/home/types";

// Temporary development fixture mirroring the documented Laravel response.
// Local image paths are used while the Laravel storage server is unavailable.
export const bannersFixture = {
  success: true,
  message: "Banners retrieved successfully",
  data: [
    {
      id: 18,
      title: "عروض الصيف",
      image_url: "/images/hero-01.png",
      link_url: null,
      sort_order: 5,
    },
    {
      id: 20,
      title: "تخفيضات حصرية",
      image_url: "/images/hero-02.png",
      link_url: null,
      sort_order: 7,
    },
    {
      id: 21,
      title: "عرض محدود الوقت",
      image_url: "/images/hero-03.png",
      link_url: "/products/quia-odio-temporibus-architecto-molestiae",
      sort_order: 10,
    },
  ],
} satisfies BannersResponseDto;
