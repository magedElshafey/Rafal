import "server-only";

import {
  sanitizeHtml,
  type SafeHtmlPolicy,
} from "@/lib/security/sanitize-html";
import { cn } from "@/lib/utils";

type SafeHtmlProps = {
  className?: string;
  html: string;
  policy: SafeHtmlPolicy;
};

export function SafeHtml({ className, html, policy }: SafeHtmlProps) {
  return (
    <div
      className={cn(className)}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html, policy) }}
    />
  );
}
