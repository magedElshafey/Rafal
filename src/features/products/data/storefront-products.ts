import type { StorefrontProduct } from "@/features/products/types/storefront-product.types";

const products = [
  {
    id: "silver-heart-ring",
    slug: "silver-heart-ring",
    name: { ar: "خاتم فضة مرصع", en: "Studded silver ring" },
    imageUrl: "/images/home/heart-necklace.png",
    category: "jewelry",
    price: 150,
    rating: 4.8,
  },
  {
    id: "heart-necklace",
    slug: "heart-necklace",
    name: { ar: "قلادة قلب فضية", en: "Silver heart necklace" },
    imageUrl: "/images/home/heart-necklace.png",
    category: "jewelry",
    price: 150,
    rating: 4.7,
  },
  {
    id: "personalized-heart-necklace",
    slug: "personalized-heart-necklace",
    name: { ar: "قلادة قلب بالاسم", en: "Personalized heart necklace" },
    imageUrl: "/images/home/name-necklace.png",
    category: "jewelry",
    price: 150,
    rating: 4.9,
    badge: "personalization",
  },
  {
    id: "womens-silver-bracelet",
    slug: "womens-silver-bracelet",
    name: { ar: "أسورة فضة نسائية", en: "Women's silver bracelet" },
    imageUrl: "/images/home/name-necklace.png",
    category: "accessories",
    price: 150,
    rating: 4.6,
    badge: "new",
  },
  {
    id: "personalized-gold-chain",
    slug: "personalized-gold-chain",
    name: { ar: "سلسال ذهبي بالاسم", en: "Personalized gold chain" },
    imageUrl: "/images/home/heart-necklace.png",
    category: "jewelry",
    price: 120,
    originalPrice: 150,
    rating: 4.9,
    badge: "discount",
  },
  {
    id: "amber-perfume",
    slug: "amber-perfume",
    name: { ar: "عطر العنبر الفاخر", en: "Luxury amber perfume" },
    imageUrl: "/images/categories/perfumes.png",
    category: "perfumes",
    price: 180,
    rating: 4.5,
    badge: "new",
  },
] satisfies StorefrontProduct[];

export const bestSellerProducts = products;

export const latestProducts = [
  products[3],
  products[5],
  products[2],
  products[0],
  products[1],
  products[4],
];

export const featuredProducts = [
  products[1],
  products[4],
  products[0],
  products[2],
  products[5],
  products[3],
];
