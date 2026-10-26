function getRequiredUrl(name: string, value: string | undefined): URL {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  try {
    return new URL(value);
  } catch {
    throw new Error(
      `Invalid ${name} environment variable: "${value}". Expected an absolute URL.`,
    );
  }
}

export const clientEnv = {
  // Public, browser/referrer-restricted LocationIQ token only. Optional by design.
  addressMapToken: process.env.NEXT_PUBLIC_LOCATIONIQ_TOKEN?.trim() || null,
  apiBaseUrl: getRequiredUrl(
    "NEXT_PUBLIC_API_BASE_URL",
    process.env.NEXT_PUBLIC_API_BASE_URL,
  ),
};
