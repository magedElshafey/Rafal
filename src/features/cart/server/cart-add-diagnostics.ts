import "server-only";

export type CartAddDiagnosticStage =
  | "city"
  | "identity-start"
  | "identity"
  | "laravel-request-start"
  | "laravel-response"
  | "parse-complete"
  | "token-persist-start"
  | "token-persist-complete"
  | "success";

type CartAddDiagnosticFacts =
  | { cityIdPresent: boolean }
  | {
      kind: "guest" | "authenticated";
      hasExistingGuestToken: boolean;
    }
  | { hasReturnedToken: boolean; itemsCount: number | null };

export type CartAddDiagnostics = {
  failure(error: unknown): void;
  stage(stage: CartAddDiagnosticStage, facts?: CartAddDiagnosticFacts): void;
};

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    return { errorName: error.name, errorMessage: error.message };
  }

  return { errorName: typeof error, errorMessage: String(error) };
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function getCartAddResponseFacts(payload: unknown): {
  hasReturnedToken: boolean;
  itemsCount: number | null;
} {
  const data = record(record(payload)?.data);
  const itemsCount = data?.items_count;

  return {
    hasReturnedToken:
      typeof data?.token === "string" && data.token.length > 0,
    itemsCount:
      typeof itemsCount === "number" && Number.isFinite(itemsCount)
        ? itemsCount
        : null,
  };
}

export function createCartAddDiagnostics(): CartAddDiagnostics {
  let currentStage: CartAddDiagnosticStage = "city";
  const enabled = process.env.NODE_ENV === "development";

  return {
    stage(stage, facts) {
      currentStage = stage;
      if (!enabled) return;

      if (facts) {
        console.info(`[cart:add] ${stage}`, facts);
      } else {
        console.info(`[cart:add] ${stage}`);
      }
    },
    failure(error) {
      if (!enabled) return;
      console.error("[cart:add] failed", {
        stage: currentStage,
        ...errorDetails(error),
      });
    },
  };
}
