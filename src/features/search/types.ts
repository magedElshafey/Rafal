export type ProductPrice = {
  amount: number;
  currency: "SAR";
};

export type SearchProduct = {
  id: string;
  name: string;
  thumbnail: {
    src: string;
    alt: string;
  };
  price: ProductPrice;
};
