import "server-only";

import { serverEnv } from "@/config/server-env";
import { mapBannerDto } from "@/features/home/api/banner-mapper";
import type { Banner, BannersResponseDto } from "@/features/home/types";
import { serverApi } from "@/lib/api/server-api";

export async function getBanners(): Promise<Banner[]> {
  const response = serverEnv.useMockApi
    ? (await import("./banner-fixture")).bannersFixture
    : await serverApi.request<BannersResponseDto>({ path: "/banners" });

  return response.data.map(mapBannerDto);
}
