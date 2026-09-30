export const staticPageRegistry = {
  privacy: { route: "/privacy", backendSlug: "privacy-policy" },
  terms: { route: "/terms", backendSlug: "terms-and-conditions" },
  returns: { route: "/returns", backendSlug: "return-policy" },
  shipping: { route: "/shipping", backendSlug: "shipping-policy" },
} as const;

// Keys also identify the localized presentation metadata.
export type StaticPageKey = keyof typeof staticPageRegistry;
