const defaultReturnTo = "/account/profile";

export function getSafeInternalReturnTo(
  value: string,
  fallback = defaultReturnTo,
): string {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  const internalOrigin = "https://rafal.internal";

  try {
    const url = new URL(value, internalOrigin);
    if (url.origin !== internalOrigin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
