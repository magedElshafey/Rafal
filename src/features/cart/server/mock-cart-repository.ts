import "server-only";

import { randomBytes } from "node:crypto";

import { serverEnv } from "@/config/server-env";
import type { ProductPersonalizationInput } from "@/features/products/types/product-details.types";

export type CartOwner =
  | { kind: "guest"; id: string }
  | { kind: "customer"; id: string };

export type StoredCartLine = {
  lineId: string;
  productId: string;
  variantId: string;
  quantity: number;
  personalization: ProductPersonalizationInput | null;
};

export type StoredCart = {
  lines: readonly StoredCartLine[];
};

type StoredCartEntry = {
  cart: StoredCart;
  expiresAt: number;
  lastAccessedAt: number;
};

const CART_TTL_MS = 2 * 60 * 60 * 1_000;
const MAX_CART_ENTRIES = 500;
const carts = new Map<string, StoredCartEntry>();
const mutationQueues = new Map<string, Promise<void>>();

function assertMockCartRepositoryAvailable() {
  if (!serverEnv.useMockApi || process.env.NODE_ENV === "production") {
    throw new Error("The mock Cart repository is unavailable.");
  }
}

function getOwnerKey(owner: CartOwner): string {
  return `${owner.kind}:${owner.id}`;
}

function cleanupEntries(now: number) {
  for (const [key, entry] of carts) {
    if (entry.expiresAt <= now) carts.delete(key);
  }

  if (carts.size < MAX_CART_ENTRIES) return;

  const oldestEntry = [...carts.entries()].reduce((oldest, candidate) =>
    candidate[1].lastAccessedAt < oldest[1].lastAccessedAt
      ? candidate
      : oldest,
  );
  carts.delete(oldestEntry[0]);
}

async function withOwnerMutationLock<T>(
  ownerKey: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = mutationQueues.get(ownerKey) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => gate);
  mutationQueues.set(ownerKey, tail);

  await previous;

  try {
    return await operation();
  } finally {
    release();
    if (mutationQueues.get(ownerKey) === tail) mutationQueues.delete(ownerKey);
  }
}

function readEntry(ownerKey: string, now: number): StoredCart {
  const entry = carts.get(ownerKey);
  if (!entry || entry.expiresAt <= now) {
    if (entry) carts.delete(ownerKey);
    return { lines: [] };
  }

  entry.lastAccessedAt = now;
  entry.expiresAt = now + CART_TTL_MS;
  return entry.cart;
}

export async function readMockStoredCart(
  owner: CartOwner,
): Promise<StoredCart> {
  assertMockCartRepositoryAvailable();

  const now = Date.now();
  cleanupEntries(now);
  return readEntry(getOwnerKey(owner), now);
}

export async function addMockStoredCartLine(
  owner: CartOwner,
  input: Omit<StoredCartLine, "lineId">,
): Promise<{ cart: StoredCart; affectedLineId: string }> {
  assertMockCartRepositoryAvailable();

  const ownerKey = getOwnerKey(owner);
  return withOwnerMutationLock(ownerKey, async () => {
    const now = Date.now();
    cleanupEntries(now);

    const current = readEntry(ownerKey, now);
    const affectedLineId = randomBytes(18).toString("base64url");
    const personalization = input.personalization
      ? { ...input.personalization }
      : null;
    const cart: StoredCart = {
      lines: [
        ...current.lines,
        { ...input, personalization, lineId: affectedLineId },
      ],
    };

    carts.set(ownerKey, {
      cart,
      expiresAt: now + CART_TTL_MS,
      lastAccessedAt: now,
    });

    return { cart, affectedLineId };
  });
}

// Development only: process restarts and HMR may lose state, multiple server
// instances do not share state, and Laravel will own production persistence,
// line equality, and guest/customer merge behavior.
