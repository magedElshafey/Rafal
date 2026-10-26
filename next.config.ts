import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

function getApiStoragePattern(): URL[] {
  if (!process.env.API_BASE_URL) return [];

  try {
    const pattern = new URL(process.env.API_BASE_URL);
    pattern.pathname = "/storage/**";
    pattern.search = "";
    return [pattern];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  ...(process.env.RAFAL_MAP_E2E === "1" ? {
    distDir: ".next-map-e2e",
    typescript: { tsconfigPath: "tests/e2e/tsconfig.json" },
  } : {}),
  images: {
    remotePatterns: getApiStoragePattern(),
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
