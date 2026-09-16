import type { Money } from "@/types/money.types";

export type ProductPrice = Money;

export type SearchProduct = {
  id: string;
  name: string;
  thumbnail: {
    src: string;
    alt: string;
  };
  price: ProductPrice;
};
