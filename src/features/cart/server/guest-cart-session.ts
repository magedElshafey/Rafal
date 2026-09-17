import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { serverEnv } from "@/config/server-env";

const MOCK_GUEST_CART_COOKIE_NAME = "rafal_mock_guest_cart_id";
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export class GuestCartSessionError extends Error {
  constructor() {
    super("The mock guest Cart session could not be created.");
    this.name = "GuestCartSessionError";
  }
}

function assertMockGuestCartSessionAvailable() {
  if (!serverEnv.useMockApi || process.env.NODE_ENV === "production") {
    throw new GuestCartSessionError();
  }
}

export async function getMockGuestCartSessionId(): Promise<string | null> {
  assertMockGuestCartSessionAvailable();

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(MOCK_GUEST_CART_COOKIE_NAME)?.value;

  return sessionId && SESSION_ID_PATTERN.test(sessionId) ? sessionId : null;
}

export async function createMockGuestCartSessionId(): Promise<string> {
  assertMockGuestCartSessionAvailable();

  const sessionId = randomBytes(32).toString("base64url");

  try {
    const cookieStore = await cookies();
    cookieStore.set(MOCK_GUEST_CART_COOKIE_NAME, sessionId, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  } catch {
    throw new GuestCartSessionError();
  }

  return sessionId;
}
