import { hasLocale } from "next-intl";

import { ProductReviewsContractError } from "@/features/reviews/api/parse-product-reviews-dto";
import {
  readProductReviews,
} from "@/features/reviews/server/product-reviews-boundary";
import {
  ProductReviewAuthenticationError,
  submitCurrentUserProductReview,
} from "@/features/reviews/server/product-review-submission-boundary";
import type { ProductReviewSubmissionInput } from "@/features/reviews/types/product-review.types";
import { isProductReviewSubmissionRating } from "@/features/reviews/utils/is-product-review-rating";
import { clearAccessToken } from "@/features/auth/server/auth-session";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";

const headers = { "Cache-Control": "private, no-store" };

type DevelopmentReviewDiagnostic = Readonly<{
  upstreamStatus: number;
  upstreamMessage?: string;
  upstreamCode?: string;
  upstreamErrorKeys?: readonly string[];
}>;

function positiveInteger(value: string | null): number | null {
  if (value === null || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function errorResponse(
  code: string,
  status: number,
  debug?: DevelopmentReviewDiagnostic,
) {
  return Response.json(
    { code, ...(debug ? { errors: { debug } } : {}) },
    { status, headers },
  );
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSubmissionInput(value: unknown): ProductReviewSubmissionInput | null {
  if (!plainRecord(value) || !isProductReviewSubmissionRating(value.rating)) {
    return null;
  }
  if (value.comment !== undefined && typeof value.comment !== "string") {
    return null;
  }
  const comment = typeof value.comment === "string" ? value.comment.trim() : "";
  return { rating: value.rating, ...(comment ? { comment } : {}) };
}

function hasEditableValidationErrors(details: unknown): boolean {
  return (
    plainRecord(details) &&
    Object.keys(details).some((field) => field === "rating" || field === "comment")
  );
}

function redactDevelopmentMessage(
  message: string,
  comment?: string,
): string | undefined {
  let safeMessage = message
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(
      /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi,
      "[email redacted]",
    )
    .replace(/\+?\d[\d\s()-]{7,}\d/g, "[phone redacted]")
    .trim();
  if (comment) {
    safeMessage = safeMessage.replaceAll(comment, "[review text redacted]");
  }
  return safeMessage ? safeMessage.slice(0, 500) : undefined;
}

function developmentDiagnostic(
  error: unknown,
  comment?: string,
): DevelopmentReviewDiagnostic | undefined {
  if (process.env.NODE_ENV === "production" || !(error instanceof ApiError)) {
    return undefined;
  }

  const upstreamCode =
    typeof error.code === "string" && /^[a-z0-9._:-]{1,100}$/i.test(error.code)
      ? error.code
      : undefined;
  const upstreamErrorKeys = plainRecord(error.details)
    ? Object.keys(error.details)
        .filter((key) => /^[a-z0-9._:-]{1,100}$/i.test(key))
        .slice(0, 20)
    : [];
  const upstreamMessage = redactDevelopmentMessage(error.message, comment);

  return {
    upstreamStatus: error.status,
    ...(upstreamMessage ? { upstreamMessage } : {}),
    ...(upstreamCode ? { upstreamCode } : {}),
    ...(upstreamErrorKeys.length > 0 ? { upstreamErrorKeys } : {}),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const locale = request.headers.get("Accept-Language");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return Response.json({ code: "invalid-locale" }, { status: 400, headers });
  }
  const { productId } = await params;
  const query = new URL(request.url).searchParams;
  const page = positiveInteger(query.get("page"));
  if (
    !positiveInteger(productId) ||
    page === null ||
    query.getAll("page").length !== 1
  ) {
    return Response.json({ code: "invalid-input" }, { status: 400, headers });
  }

  // Public read only. No session lookup or credential/header forwarding.
  const result = await readProductReviews(productId, locale, {
    page,
    signal: request.signal,
    retry: false,
  });
  return result.ok
    ? Response.json(result.page, { headers })
    : Response.json({ code: "reviews-unavailable" }, { status: 503, headers });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const locale = request.headers.get("Accept-Language");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return errorResponse("invalid-locale", 400);
  }
  const { productId } = await params;
  if (!positiveInteger(productId)) {
    return errorResponse("invalid-input", 400);
  }

  let input: ProductReviewSubmissionInput | null = null;
  try {
    input = parseSubmissionInput(await request.json());
  } catch {
    // Invalid or non-JSON browser input is rejected below.
  }
  if (!input) return errorResponse("invalid-input", 400);

  try {
    const submission = await submitCurrentUserProductReview(
      productId,
      locale,
      input,
      request.signal,
    );
    return Response.json(
      { status: submission.status },
      { status: 201, headers },
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : undefined;
    const debug = developmentDiagnostic(error, input.comment);
    console.error("[product-reviews:submit] failed", {
      productId,
      category:
        error instanceof ProductReviewsContractError
          ? "contract"
          : error instanceof ProductReviewAuthenticationError || status === 401
            ? "auth"
            : "request",
      ...(status === undefined ? {} : { status }),
      ...(debug?.upstreamMessage
        ? { backendMessage: debug.upstreamMessage }
        : {}),
      ...(debug?.upstreamCode ? { backendCode: debug.upstreamCode } : {}),
      ...(debug?.upstreamErrorKeys
        ? { backendErrorKeys: debug.upstreamErrorKeys }
        : {}),
    });

    if (error instanceof ProductReviewAuthenticationError || status === 401) {
      if (status === 401) await clearAccessToken();
      return errorResponse("auth-required", 401, debug);
    }
    if (
      error instanceof ApiError &&
      status === 422 &&
      hasEditableValidationErrors(error.details)
    ) {
      return errorResponse("invalid-input", 422, debug);
    }
    if (status === 403 || status === 409 || status === 422) {
      return errorResponse(
        "review-not-allowed",
        status === 403 ? 403 : 409,
        debug,
      );
    }
    if (status === 429) return errorResponse("rate-limited", 429, debug);
    return errorResponse("service-unavailable", 503, debug);
  }
}
