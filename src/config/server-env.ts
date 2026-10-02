import "server-only";

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

export const serverEnv = {
  siteUrl: getRequiredUrl("SITE_URL", process.env.SITE_URL),
  apiBaseUrl: getRequiredUrl("API_BASE_URL", process.env.API_BASE_URL),
};
