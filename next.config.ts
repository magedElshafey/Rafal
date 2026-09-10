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
  images: {
    remotePatterns: getApiStoragePattern(),
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
