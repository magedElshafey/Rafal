import {
  ProductReviewSubmission,
  type ProductReviewSubmissionCopy,
} from "@/features/reviews/components/product-review-submission";
import { getProductReviewEligibility } from "@/features/reviews/server/product-review-boundary";

type ProductReviewEligibilityProps = {
  copy: ProductReviewSubmissionCopy;
  loginReturnTo: string;
  productId: string;
};

export async function ProductReviewEligibility({
  copy,
  loginReturnTo,
  productId,
}: ProductReviewEligibilityProps) {
  const eligibility = await getProductReviewEligibility(productId);

  return (
    <ProductReviewSubmission
      copy={copy}
      eligibility={eligibility}
      loginReturnTo={loginReturnTo}
      productId={productId}
    />
  );
}

export function ProductReviewEligibilityLoading({
  copy,
}: Pick<ProductReviewEligibilityProps, "copy">) {
  return (
    <div
      aria-busy="true"
      role="status"
      className="min-h-36 rounded-lg border border-gray-200 bg-gray-50 p-5 sm:p-6"
    >
      <h3 className="text-h4 font-bold">{copy.title}</h3>
      <p className="mt-2 type-body text-gray-600">{copy.loading}</p>
    </div>
  );
}
