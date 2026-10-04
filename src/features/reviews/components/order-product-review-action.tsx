"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import type { Locale } from "next-intl";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { CheckIcon, InfoIcon } from "@/components/ui/icons/interface-icons";
import { RafalModal } from "@/components/ui/rafal-modal";
import { Textarea } from "@/components/ui/textarea";
import { submitProductReviewFromBrowser } from "@/features/reviews/api/submit-product-review.client";
import { ProductReviewRatingInput } from "@/features/reviews/components/product-review-rating-input";
import type { ProductReviewSubmissionRating } from "@/features/reviews/types/product-review.types";
import { ApiError } from "@/lib/api/api-error";

export type OrderProductReviewCopy = Readonly<{
  action: string;
  pendingReview: string;
  title: string;
  question: string;
  ratingLabel: string;
  ratingRequired: string;
  commentLabel: string;
  commentPlaceholder: string;
  cancel: string;
  submit: string;
  submitting: string;
  close: string;
  successTitle: string;
  successBody: string;
  developmentDiagnostic: string;
  errors: Readonly<{
    auth: string;
    validation: string;
    notAllowed: string;
    rateLimited: string;
    service: string;
  }>;
}>;

type OrderProductReviewActionProps = {
  copy: OrderProductReviewCopy;
  locale: Locale;
  productId: string;
  productName: string;
};

function submissionError(copy: OrderProductReviewCopy, error: unknown): string {
  if (!(error instanceof ApiError)) return copy.errors.service;
  if (error.code === "auth-required") return copy.errors.auth;
  if (error.code === "invalid-input") return copy.errors.validation;
  if (error.code === "review-not-allowed") return copy.errors.notAllowed;
  if (error.code === "rate-limited") return copy.errors.rateLimited;
  return copy.errors.service;
}

type SubmissionFailure = Readonly<{
  customerMessage: string;
  developmentDiagnostic?: string;
}>;

function plainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatDevelopmentDiagnostic(error: unknown): string | undefined {
  if (process.env.NODE_ENV === "production" || !(error instanceof ApiError)) {
    return undefined;
  }
  if (!plainRecord(error.details) || !plainRecord(error.details.debug)) {
    return undefined;
  }

  const debug = error.details.debug;
  if (
    typeof debug.upstreamStatus !== "number" ||
    !Number.isInteger(debug.upstreamStatus)
  ) {
    return undefined;
  }
  const message =
    typeof debug.upstreamMessage === "string"
      ? debug.upstreamMessage.trim()
      : "";
  return `Backend ${debug.upstreamStatus}${message ? `: ${message}` : ""}`;
}

export function OrderProductReviewAction({
  copy,
  locale,
  productId,
  productName,
}: OrderProductReviewActionProps) {
  const reactId = useId();
  const formId = `product-review-${reactId}`;
  const ratingName = `${formId}-rating`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const submissionPendingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState<ProductReviewSubmissionRating | null>(null);
  const [comment, setComment] = useState("");
  const [ratingError, setRatingError] = useState<string>();
  const [formError, setFormError] = useState<SubmissionFailure>();

  const handleOpenChange = (nextOpen: boolean) => {
    if (submissionPendingRef.current) return;
    setOpen(nextOpen);
    if (!nextOpen && !submitted) {
      setRating(null);
      setComment("");
      setRatingError(undefined);
      setFormError(undefined);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionPendingRef.current) return;
    if (rating === null) {
      setRatingError(copy.ratingRequired);
      return;
    }

    submissionPendingRef.current = true;
    setPending(true);
    setRatingError(undefined);
    setFormError(undefined);
    try {
      const trimmedComment = comment.trim();
      await submitProductReviewFromBrowser({
        productId,
        locale,
        input: {
          rating,
          ...(trimmedComment ? { comment: trimmedComment } : {}),
        },
      });
      setSubmitted(true);
    } catch (error) {
      const developmentDiagnostic = formatDevelopmentDiagnostic(error);
      setFormError({
        customerMessage: submissionError(copy, error),
        ...(developmentDiagnostic ? { developmentDiagnostic } : {}),
      });
    } finally {
      submissionPendingRef.current = false;
      setPending(false);
    }
  };

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        size="sm"
        variant="outline"
        className="h-auto min-h-11 w-full whitespace-normal sm:w-auto"
        aria-disabled={submitted || undefined}
        onClick={() => {
          if (!submitted) setOpen(true);
        }}
      >
        {submitted ? copy.pendingReview : copy.action}
      </Button>

      <RafalModal
        open={open}
        onOpenChange={handleOpenChange}
        returnFocusRef={triggerRef}
        title={
          <span className={submitted ? "block text-center" : undefined}>
            {submitted ? copy.successTitle : copy.title}
          </span>
        }
        description={submitted ? undefined : productName}
        dismissible={!pending}
        className="sm:max-w-md"
        footer={
          submitted ? (
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => setOpen(false)}
            >
              {copy.close}
            </Button>
          ) : (
            <>
              <Button
                type="submit"
                size="sm"
                form={formId}
                loading={pending}
                loadingLabel={copy.submitting}
                className="w-full sm:w-auto"
              >
                {copy.submit}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                className="w-full sm:w-auto"
                onClick={() => handleOpenChange(false)}
              >
                {copy.cancel}
              </Button>
            </>
          )
        }
      >
        {submitted ? (
          <div
            role="status"
            aria-live="polite"
            className="py-3 text-center"
          >
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckIcon aria-hidden="true" className="size-7" />
            </span>
            <p className="mx-auto mt-4 max-w-sm type-body text-gray-600">
              {copy.successBody}
            </p>
          </div>
        ) : (
          <form
            id={formId}
            className="mt-5 space-y-6"
            onSubmit={handleSubmit}
            noValidate
            aria-busy={pending || undefined}
            aria-describedby={formError ? `${formId}-error` : undefined}
          >
            <ProductReviewRatingInput
              name={ratingName}
              legend={copy.question}
              ratingLabelTemplate={copy.ratingLabel}
              value={rating}
              error={ratingError}
              onChange={(nextRating) => {
                setRating(nextRating);
                setRatingError(undefined);
                setFormError(undefined);
              }}
            />
            <Field>
              <FieldLabel htmlFor={`${formId}-comment`}>
                {copy.commentLabel}
              </FieldLabel>
              <Textarea
                id={`${formId}-comment`}
                name="comment"
                value={comment}
                placeholder={copy.commentPlaceholder}
                disabled={pending}
                className="min-h-30 max-h-40 resize-y"
                onChange={(event) => {
                  setComment(event.target.value);
                  setFormError(undefined);
                }}
              />
            </Field>
            {formError ? (
              <div
                id={`${formId}-error`}
                role="alert"
                className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5"
              >
                <p className="flex items-start gap-2 type-body-sm font-medium text-destructive">
                  <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span>{formError.customerMessage}</span>
                </p>
                {formError.developmentDiagnostic ? (
                  <p className="mt-2 border-t border-destructive/15 pt-2 type-caption text-gray-600">
                    <span className="font-medium">
                      {copy.developmentDiagnostic}:
                    </span>{" "}
                    <bdi>{formError.developmentDiagnostic}</bdi>
                  </p>
                ) : null}
              </div>
            ) : null}
          </form>
        )}
      </RafalModal>
    </>
  );
}
