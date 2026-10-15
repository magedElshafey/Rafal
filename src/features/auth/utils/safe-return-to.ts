const defaultReturnTo = "/";

export function getSafeInternalReturnTo(
  value: string,
  fallback = defaultReturnTo,
): string {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const decoded = decodeURIComponent(value);
    if (/[\u0000-\u001f\u007f\\]/.test(decoded) || decoded.startsWith("//")) {
      return fallback;
    }
  } catch {
    return fallback;
  }

  const internalOrigin = "https://rafal.internal";

  try {
    const url = new URL(value, internalOrigin);
    if (url.origin !== internalOrigin || url.pathname.startsWith("//")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
