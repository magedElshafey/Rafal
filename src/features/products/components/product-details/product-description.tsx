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
    <section aria-labelledby="product-description-title" className="grid gap-4 rounded-lg bg-gray-50 p-5 sm:p-6 lg:grid-cols-4 lg:gap-8 lg:p-8">
      <h2 id="product-description-title" className="text-h3 font-bold">
        {title}
      </h2>
      <SafeHtml
        className="max-w-prose space-y-3 break-words type-body leading-7 text-gray-700 lg:col-span-3"
        html={description.html}
        policy="product-rich-text"
      />
    </section>
  );
}
