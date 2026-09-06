function getSiteUrl() {
  const value = process.env.SITE_URL;

  if (!value) {
    throw new Error("Missing required environment variable: SITE_URL");
  }

  try {
    return new URL(value);
  } catch {
    throw new Error(
      `Invalid SITE_URL environment variable: "${value}". Expected an absolute URL.`,
    );
  }
}

export const env = {
  siteUrl: getSiteUrl(),
};
