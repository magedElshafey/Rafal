import { SafeHtml } from "@/components/ui/safe-html";
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
    <section aria-labelledby="product-description-title" className="space-y-4 rounded-lg bg-gray-50 p-5 sm:p-6 lg:p-8">
      <h2 id="product-description-title" className="text-h3 font-bold">
        {title}
      </h2>
      <SafeHtml
        className="space-y-3 break-words type-body leading-7 text-gray-700"
        html={description.html}
        policy="product-rich-text"
      />
    </section>
  );
}
