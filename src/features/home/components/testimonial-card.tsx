import { RatingStarIcon } from "@/components/ui/icons";

type TestimonialCardProps = {
  author: string;
  quote: string;
  rating: number;
};

export function TestimonialCard({
  author,
  quote,
  rating,
}: TestimonialCardProps) {
  return (
    <figure className="flex h-full min-h-40 flex-col justify-between rounded-md border border-border bg-gray-0 p-5">
      <blockquote className="type-body text-foreground">{quote}</blockquote>
      <figcaption className="mt-5 flex items-center justify-between gap-4">
        <span className="type-body-sm font-medium text-foreground">
          {author}
        </span>
        <span className="flex gap-1 text-gold-500" aria-hidden="true">
          {Array.from({ length: rating }, (_, index) => (
            <RatingStarIcon key={index} className="size-3.5" />
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
