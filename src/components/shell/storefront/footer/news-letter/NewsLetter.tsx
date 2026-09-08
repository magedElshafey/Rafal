import { Button } from "@/components/ui/button";

import FooterTitle from "../footer-title/FooterTitle";
import { Input } from "@/components/ui/input";

interface NewsLetterProps {
  description: string;
  emailLabel: string;
  placeholder: string;
  submitLabel: string;
  title: string;
}

export default function NewsLetter({
  description,
  emailLabel,
  placeholder,
  submitLabel,
  title,
}: NewsLetterProps) {
  const titleId = "footer-newsletter-title";

  return (
    <section id="footer-newsletter" className="min-w-0">
      <FooterTitle id={titleId}>{title}</FooterTitle>
      <p className="mt-3.5 type-body text-gray-400">{description}</p>
      <form
        aria-labelledby={titleId}
        className="mt-3 xl:mt-[var(--footer-newsletter-form-gap)]"
        method="get"
      >
        <label
          htmlFor="footer-newsletter-email"
          className="text-gray-600 mb-1 block"
        >
          {emailLabel}
        </label>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] md:grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            id="footer-newsletter-email"
            name="newsletterEmail"
            type="email"
            autoComplete="email"
            required
            placeholder={placeholder}
            className="min-w-0 text-start rounded-sm"
          />

          <Button
            type="submit"
            size="md"
            variant="ghost"
            className="justify-self-start px-3 text-gray-0 hover:bg-gray-900"
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
}
