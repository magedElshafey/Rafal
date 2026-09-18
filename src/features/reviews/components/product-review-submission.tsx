"use client";

import { useState, useTransition, type FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { RatingStarIcon } from "@/components/ui/icons";
import { formatProductMessage } from "@/features/products/utils/format-product-message";
import { submitProductReview } from "@/features/reviews/actions/submit-product-review";
import type {
  ProductReviewRating,
  ReviewEligibility,
  ReviewSubmissionErrorCode,
} from "@/features/reviews/types/product-review.types";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type ProductReviewSubmissionCopy = {
  title: string;
  loading: string;
  guestDescription: string;
  login: string;
  notVerified: string;
  unavailable: string;
  retry: string;
  retrying: string;
  ratingLabel: string;
  ratingOptionTemplate: string;
  commentLabel: string;
  commentOptional: string;
  commentPlaceholder: string;
  submit: string;
  submitting: string;
  success: string;
  errors: Record<ReviewSubmissionErrorCode | "rating-required", string>;
};

type ProductReviewSubmissionProps = {
  copy: ProductReviewSubmissionCopy;
  eligibility: ReviewEligibility;
  loginReturnTo: string;
  productId: string;
};

const ratings: readonly ProductReviewRating[] = [1, 2, 3, 4, 5];

export function ProductReviewSubmission({
  copy,
  eligibility,
  loginReturnTo,
  productId,
}: ProductReviewSubmissionProps) {
  const router = useRouter();
  const [rating, setRating] = useState<ProductReviewRating | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<
    ReviewSubmissionErrorCode | "rating-required" | null
  >(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  if (eligibility.status === "guest") {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
        <h3 className="text-h4 font-bold">{copy.title}</h3>
        <p className="mt-2 type-body text-gray-600">{copy.guestDescription}</p>
        <Link
          href={{ pathname: "/login", query: { returnTo: loginReturnTo } }}
          className={cn(buttonVariants(), "mt-4")}
        >
          {copy.login}
        </Link>
      </div>
    );
  }

  if (eligibility.status === "not-verified") {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
        <h3 className="text-h4 font-bold">{copy.title}</h3>
        <p className="mt-2 type-body text-gray-600">{copy.notVerified}</p>
      </div>
    );
  }

  if (eligibility.status === "unavailable") {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
        <h3 className="text-h4 font-bold">{copy.title}</h3>
        <p className="mt-2 type-body text-gray-600">{copy.unavailable}</p>
        <Button
          className="mt-4"
          loading={pending}
          loadingLabel={copy.retrying}
          onClick={() => startTransition(() => router.refresh())}
          variant="outline"
        >
          {copy.retry}
        </Button>
      </div>
    );
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(false);

    if (rating === null) {
      setError("rating-required");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const result = await submitProductReview({
          productId,
          rating,
          comment,
        });

        if (!result.ok) {
          setError(result.error.code);
          return;
        }

        setRating(null);
        setComment("");
        setSubmitted(true);
      } catch {
        setError("service-unavailable");
      }
    });
  };

  return (
    <form
      aria-labelledby="product-review-form-title"
      className="rounded-lg border border-gray-200 bg-gray-50 p-5 sm:p-6"
      onSubmit={handleSubmit}
      noValidate
    >
      <h3 id="product-review-form-title" className="text-h4 font-bold">
        {copy.title}
      </h3>

      <fieldset
        className="mt-5"
        disabled={pending}
        aria-describedby={
          error === "rating-required" ? "product-review-rating-error" : undefined
        }
        aria-invalid={error === "rating-required" || undefined}
      >
        <legend className="type-label text-gray-700">{copy.ratingLabel}</legend>
        <div className="mt-2 flex w-fit gap-1" dir="ltr">
          {ratings.map((value) => (
            <label key={value} className="relative cursor-pointer">
              <input
                className="peer sr-only"
                type="radio"
                name="product-review-rating"
                value={value}
                checked={rating === value}
                onChange={() => {
                  setRating(value);
                  setError(null);
                  setSubmitted(false);
                }}
              />
              <span className="flex size-11 items-center justify-center rounded-full text-gray-200 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
                <RatingStarIcon
                  aria-hidden="true"
                  className={cn(
                    "size-7",
                    rating !== null && value <= rating && "text-gold-500",
                  )}
                />
                <span className="sr-only">
                  {formatProductMessage(copy.ratingOptionTemplate, { value })}
                </span>
              </span>
            </label>
          ))}
        </div>
        {error === "rating-required" ? (
          <p
            id="product-review-rating-error"
            role="alert"
            className="mt-2 type-caption text-destructive"
          >
            {copy.errors[error]}
          </p>
        ) : null}
      </fieldset>

      <div className="mt-5 flex flex-col gap-1.5">
        <label
          htmlFor="product-review-comment"
          className="type-label text-gray-700"
        >
          {copy.commentLabel}{" "}
          <span className="font-normal text-gray-400">
            {copy.commentOptional}
          </span>
        </label>
        <textarea
          id="product-review-comment"
          name="comment"
          rows={4}
          value={comment}
          disabled={pending}
          placeholder={copy.commentPlaceholder}
          onChange={(event) => {
            setComment(event.target.value);
            setError(null);
            setSubmitted(false);
          }}
          className="min-h-28 w-full resize-y rounded-md border border-gray-200 bg-gray-0 px-3.5 py-3 type-body text-gray-1000 outline-none placeholder:text-gray-400 focus:border-[length:var(--border-width-emphasis)] focus:border-gold-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        />
      </div>

      {error && error !== "rating-required" ? (
        <p role="alert" className="mt-4 type-body-sm text-destructive">
          {copy.errors[error]}
        </p>
      ) : null}
      {submitted ? (
        <p role="status" className="mt-4 type-body-sm text-success">
          {copy.success}
        </p>
      ) : null}

      <Button
        className="mt-5 w-full sm:w-auto"
        type="submit"
        loading={pending}
        loadingLabel={copy.submitting}
      >
        {copy.submit}
      </Button>
    </form>
  );
}
