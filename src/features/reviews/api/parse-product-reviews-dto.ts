import type {
  ProductReviewDto,
  ProductReviewsResponseDto,
} from "@/features/reviews/api/product-reviews-dto";
import { isProductReviewRating } from "@/features/reviews/utils/is-product-review-rating";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

export class ProductReviewsContractError extends Error {
  readonly path: string;

  constructor(path: string, expected: string) {
    super(`Invalid Product Reviews API payload at "${path}": expected ${expected}.`);
    this.name = "ProductReviewsContractError";
    this.path = path;
  }
}

const {
  parseArray,
  parseFiniteNumber,
  parseNonEmptyString,
  parseNullableString,
  parseRecord,
  parseString,
} = createRuntimeValidators(
  (path, expected) => new ProductReviewsContractError(path, expected),
);

function integer(value: unknown, path: string, minimum = 0): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum
  ) {
    throw new ProductReviewsContractError(path, `an integer >= ${minimum}`);
  }
  return value;
}

function photoUrl(value: unknown, path: string): string {
  const text = parseNonEmptyString(value, path);
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new ProductReviewsContractError(path, "an absolute HTTP(S) image URL");
  }
  if (
    !/^https?:\/\//i.test(text) ||
    !/^https?:$/.test(url.protocol) ||
    url.username ||
    url.password ||
    /\s/.test(text)
  ) {
    throw new ProductReviewsContractError(
      path,
      "an absolute HTTP(S) image URL without credentials or whitespace",
    );
  }
  // Read contract only: no image is rendered or fetched. Next Image's existing
  // origin/storage allowlist still governs any future image presentation.
  return text;
}

function timestamp(value: unknown, path: string): string {
  const text = parseNonEmptyString(value, path);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(text);
  if (!match || !Number.isFinite(Date.parse(text))) {
    throw new ProductReviewsContractError(path, "a valid timestamp with timezone");
  }
  const [, year, month, day] = match;
  const calendarDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (
    calendarDate.getUTCMonth() + 1 !== Number(month) ||
    calendarDate.getUTCDate() !== Number(day)
  ) {
    throw new ProductReviewsContractError(path, "a valid calendar date");
  }
  return text;
}

function reportIsolatedMetadata(
  error: unknown,
  context: { reviewIndex: number; reviewId?: number },
  category: "review" | "photos" | "photo",
) {
  // Never log the raw object or user-authored text/URLs, including thrown values.
  console.error("[product-reviews:contract] excluded malformed data", {
    ...context,
    category,
    path: error instanceof ProductReviewsContractError ? error.path : "unknown",
  });
}

function photos(
  value: unknown,
  path: string,
  context: { reviewIndex: number; reviewId: number },
): string[] {
  // Photos are unrendered secondary metadata: an invalid collection becomes
  // empty, while an invalid item is omitted without discarding the review.
  if (!Array.isArray(value)) {
    reportIsolatedMetadata(
      new ProductReviewsContractError(path, "an array"),
      context,
      "photos",
    );
    return [];
  }
  return value.flatMap((item, index) => {
    try {
      return [photoUrl(item, `${path}[${index}]`)];
    } catch (error) {
      reportIsolatedMetadata(error, context, "photo");
      return [];
    }
  });
}

function review(
  value: unknown,
  path: string,
  reviewIndex: number,
): ProductReviewDto {
  const source = parseRecord(value, path);
  const id = integer(source.id, `${path}.id`, 1);
  if (!isProductReviewRating(source.rating)) {
    throw new ProductReviewsContractError(
      `${path}.rating`,
      "a rating from 1 to 5 in half-star increments",
    );
  }
  return {
    id,
    rating: source.rating,
    // The existing review domain permits absent comments; retain null without
    // fabricating text while accepting the current backend string response.
    comment: parseNullableString(source.comment, `${path}.comment`),
    reviewer_display_name: parseString(
      source.reviewer_display_name,
      `${path}.reviewer_display_name`,
    ),
    admin_response: parseNullableString(
      source.admin_response,
      `${path}.admin_response`,
    ),
    helpful_count: integer(source.helpful_count, `${path}.helpful_count`),
    created_at: timestamp(source.created_at, `${path}.created_at`),
    photos: photos(source.photos, `${path}.photos`, { reviewIndex, reviewId: id }),
  };
}

export function parseProductReviewsResponse(
  value: unknown,
): ProductReviewsResponseDto {
  const source = parseRecord(value, "response");
  if (source.success !== true) {
    throw new ProductReviewsContractError("response.success", "true");
  }
  const data = parseRecord(source.data, "data");
  const summary = parseRecord(data.summary, "data.summary");
  const average = parseFiniteNumber(summary.average, "data.summary.average");
  if (average < 0 || average > 5) {
    throw new ProductReviewsContractError("data.summary.average", "a number from 0 to 5");
  }
  const breakdown = parseRecord(summary.breakdown, "data.summary.breakdown");
  const meta = parseRecord(source.meta, "meta");
  return {
    success: true,
    message: parseString(source.message, "response.message"),
    data: {
      summary: {
        average,
        count: integer(summary.count, "data.summary.count"),
        breakdown: {
          "1": integer(breakdown["1"], "data.summary.breakdown.1"),
          "2": integer(breakdown["2"], "data.summary.breakdown.2"),
          "3": integer(breakdown["3"], "data.summary.breakdown.3"),
          "4": integer(breakdown["4"], "data.summary.breakdown.4"),
          "5": integer(breakdown["5"], "data.summary.breakdown.5"),
        },
      },
      reviews: parseArray(data.reviews, "data.reviews").flatMap((item, index) => {
        try {
          return [review(item, `data.reviews[${index}]`, index)];
        } catch (error) {
          reportIsolatedMetadata(error, { reviewIndex: index }, "review");
          return [];
        }
      }),
    },
    meta: {
      current_page: integer(meta.current_page, "meta.current_page", 1),
      last_page: integer(meta.last_page, "meta.last_page", 1),
      per_page: integer(meta.per_page, "meta.per_page", 1),
      total: integer(meta.total, "meta.total"),
    },
  };
}
