import { Button } from "@/components/ui/button";

import FooterTitle from "../footer-title/FooterTitle";

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
      <p className="mt-2 type-body text-gray-300">{description}</p>
      <form
        aria-labelledby={titleId}
        className="mt-3 xl:mt-[var(--footer-newsletter-form-gap)]"
        method="get"
      >
        <label htmlFor="footer-newsletter-email" className="sr-only">
          {emailLabel}
        </label>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] md:grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto]">
          <input
            id="footer-newsletter-email"
            name="newsletterEmail"
            type="email"
            autoComplete="email"
            required
            placeholder={placeholder}
            className="h-11 min-w-0 rounded-sm border border-gray-200 bg-gray-50 px-3 text-start type-body text-gray-1000 outline-none placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-gray-1000"
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
