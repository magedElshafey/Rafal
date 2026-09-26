import "server-only";

import { cookies } from "next/headers";

const GUEST_CART_TOKEN_COOKIE_NAME = "rafal_cart_token";
const MAX_CART_TOKEN_LENGTH = 4_096;

export class GuestCartSessionError extends Error {
  constructor() {
    super("The guest Cart session could not be updated.");
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
