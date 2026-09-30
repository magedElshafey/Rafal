import Image from "next/image";

import { RatingStarIcon } from "@/components/ui/icons";

type TestimonialCardProps = {
  author: string;
  title: string;
  avatarUrl: string | null;
  quote: string;
  rating: number;
  ratingLabel: string;
};

export function TestimonialCard({
  author,
  title,
  avatarUrl,
  quote,
  rating,
  ratingLabel,
}: TestimonialCardProps) {
  return (
    <figure className="flex h-full min-h-40 flex-col justify-between rounded-md border border-border bg-gray-0 p-5">
      <blockquote className="type-body text-foreground">
        {title.trim() ? <p className="mb-2 font-medium">{title}</p> : null}
        <p>{quote}</p>
      </blockquote>
      <figcaption className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <span className="flex min-w-0 items-center gap-3 type-body-sm font-medium text-foreground">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-full object-cover"
            />
          ) : null}
          <span className="min-w-0 break-words">{author}</span>
        </span>
        <span className="sr-only">{ratingLabel}</span>
        <span className="flex gap-1 text-gold-500" aria-hidden="true">
          {Array.from({ length: rating }, (_, index) => (
            <RatingStarIcon key={index} className="size-3.5" />
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
