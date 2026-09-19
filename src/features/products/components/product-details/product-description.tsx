import type { ProductDescription as ProductDescriptionModel } from "@/features/products/types/product-details.types";

type ProductDescriptionProps = {
  description: ProductDescriptionModel;
  title: string;
};

export function ProductDescription({
  description,
  title,
}: ProductDescriptionProps) {
  return (
    <section aria-labelledby="product-description-title">
      <h2 id="product-description-title" className="text-h3 font-bold">
        {title}
      </h2>
      <div className="mt-3 space-y-3 break-words type-body-lg leading-7 text-gray-500">
        {description.paragraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph}`}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
