import "server-only";

import sanitizeHtmlLibrary from "sanitize-html";

export type SafeHtmlPolicy = "product-rich-text";

const policies = {
  "product-rich-text": {
    allowedTags: [
      "p",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "strong",
      "em",
      "ul",
      "ol",
      "li",
      "a",
      "br",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attributes) => ({
        tagName,
        attribs:
          attributes.target?.toLowerCase() === "_blank"
            ? { ...attributes, rel: "noopener noreferrer" }
            : attributes,
      }),
    },
  },
} satisfies Record<SafeHtmlPolicy, sanitizeHtmlLibrary.IOptions>;

export function sanitizeHtml(
  html: string,
  policy: SafeHtmlPolicy,
): string {
  return sanitizeHtmlLibrary(html, policies[policy]);
}

export function sanitizeHtmlToText(
  html: string,
  policy: SafeHtmlPolicy,
): string {
  const fragments: string[] = [];
  const safeHtml = sanitizeHtml(html, policy);

  sanitizeHtmlLibrary(safeHtml, {
    ...policies[policy],
    textFilter: (text) => {
      fragments.push(text);
      return text;
    },
  });

  return fragments.join(" ").replace(/\s+/g, " ").trim();
}
