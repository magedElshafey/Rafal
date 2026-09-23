import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { serverEnv } from "@/config/server-env";

const MOCK_GUEST_CART_COOKIE_NAME = "rafal_mock_guest_cart_id";
const GUEST_CART_TOKEN_COOKIE_NAME = "rafal_cart_token";
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const MAX_CART_TOKEN_LENGTH = 4_096;

export class GuestCartSessionError extends Error {
  constructor() {
    super("The mock guest Cart session could not be created.");
    this.name = "GuestCartSessionError";
  }
}

function isValidCartToken(value: string): boolean {
  return value.length > 0 && value.length <= MAX_CART_TOKEN_LENGTH && !/[;\u0000-\u001F\u007F]/.test(value);
}

export async function getGuestCartToken(): Promise<string | null> {
  const value = (await cookies()).get(GUEST_CART_TOKEN_COOKIE_NAME)?.value;
  return value && isValidCartToken(value) ? value : null;
}

export async function persistGuestCartToken(token: string): Promise<void> {
  if (!isValidCartToken(token)) throw new GuestCartSessionError();
  try {
    (await cookies()).set(GUEST_CART_TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  } catch {
    throw new GuestCartSessionError();
  }
}

export async function deleteGuestCartToken(): Promise<void> {
  try {
    (await cookies()).delete(GUEST_CART_TOKEN_COOKIE_NAME);
  } catch {
    throw new GuestCartSessionError();
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

export async function deleteMockGuestCartSessionId(): Promise<void> {
  assertMockGuestCartSessionAvailable();
  (await cookies()).delete(MOCK_GUEST_CART_COOKIE_NAME);
}
