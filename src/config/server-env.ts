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

function getBoolean(
  name: string,
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new Error(`Invalid ${name} environment variable. Expected true or false.`);
}

function getUseMockApi(value: string | undefined): boolean {
  const enabled = getBoolean(
    "USE_MOCK_API",
    value,
    process.env.NODE_ENV !== "production",
  );

  if (enabled && process.env.NODE_ENV === "production") {
    throw new Error("USE_MOCK_API cannot be enabled in production.");
  }

  return enabled;
}

export const serverEnv = {
  siteUrl: getRequiredUrl("SITE_URL", process.env.SITE_URL),
  apiBaseUrl: getRequiredUrl("API_BASE_URL", process.env.API_BASE_URL),
  useMockApi: getUseMockApi(process.env.USE_MOCK_API),
};
