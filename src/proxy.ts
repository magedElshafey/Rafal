import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { routing } from "@/i18n/routing";

const localize = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  // Overwrite caller input. This is destination context, never auth authority.
  request.headers.set("x-rafal-request-path", request.nextUrl.pathname);
  return localize(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
