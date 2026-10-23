import type { QueryClient } from "@tanstack/react-query";
import { removeCartRecommendations } from "./cart-recommendations-query";

export const recommendationGateKey = ["cart-recommendation-lifecycle"] as const;
export const recommendationReconciliationKey = ["cart-recommendation-reconciliation"] as const;
export type RecommendationGate = {
  generation: number;
  cleanedGeneration: number;
  pending: readonly string[];
  remotePending: readonly string[];
  available: boolean;
  active: boolean;
};
export const initialRecommendationGate: RecommendationGate = {
  generation: 0, cleanedGeneration: -1, pending: [], remotePending: [], available: false, active: false,
};

// Callbacks only. QueryClient owns all coordination state; no identity is stored here.
const publishers = new WeakMap<QueryClient, (message: unknown) => void>();
const cleanups = new WeakMap<QueryClient, Promise<void>>();
let operationSequence = 0;
export function getRecommendationGate(client: QueryClient): RecommendationGate {
  return client.getQueryData(recommendationGateKey) ?? initialRecommendationGate;
}
export function canReconcileRecommendations(gate: RecommendationGate) {
  return gate.available && gate.active && gate.cleanedGeneration === gate.generation && !gate.pending.length && !gate.remotePending.length;
}
export function isRecommendationGenerationCurrent(client: QueryClient, generation: number) {
  const gate = getRecommendationGate(client);
  return gate.generation === generation && canReconcileRecommendations(gate);
}
function advance(client: QueryClient, changes: Partial<RecommendationGate> = {}) {
  const gate = getRecommendationGate(client);
  const generation = gate.generation + 1;
  client.setQueryData(recommendationGateKey, { ...gate, ...changes, generation });
  // Reconciliation data is private too, and must not survive a transition.
  const reconciliation = client.cancelQueries({ queryKey: recommendationReconciliationKey }).then(() => {
    client.removeQueries({ queryKey: recommendationReconciliationKey });
  });
  const cleanup = Promise.all([cleanups.get(client), removeCartRecommendations(client), reconciliation]).then(() => {
    const latest = getRecommendationGate(client);
    if (latest.generation === generation) client.setQueryData(recommendationGateKey, { ...latest, cleanedGeneration: generation });
  }).catch(() => {
    // Cleanup failure never authorizes another private read or blocks commerce.
    const latest = getRecommendationGate(client);
    if (latest.generation === generation) client.setQueryData(recommendationGateKey, { ...latest, available: false });
  });
  cleanups.set(client, cleanup);
  return cleanup;
}
export function suspendRecommendationReads(client: QueryClient) {
  return advance(client);
}
export function beginRecommendationTransition(client: QueryClient) {
  // Operation identifier, never a session/guest identity. Unsupported browsers
  // still execute commerce; the provider leaves recommendation reads disabled.
  const id = globalThis.crypto?.randomUUID?.() ?? `local-${++operationSequence}`;
  const ready = advance(client, { pending: [...getRecommendationGate(client).pending, id] });
  publishers.get(client)?.({ kind: "begin", id });
  let finished = false;
  return {
    ready,
    finish() {
      if (finished) return;
      finished = true;
      void advance(client, { pending: getRecommendationGate(client).pending.filter((entry) => entry !== id) });
      publishers.get(client)?.({ kind: "end", id });
    },
  };
}

type Channel = Pick<BroadcastChannel, "postMessage" | "addEventListener" | "removeEventListener">;
export function connectRecommendationLifecycle(client: QueryClient, channel: Channel | null, active: boolean) {
  client.setQueryDefaults(recommendationGateKey, { gcTime: Infinity });
  const unavailable = () => { void advance(client, { available: false }); };
  const publish = (message: unknown) => {
    try { channel?.postMessage(message); } catch { unavailable(); }
  };
  const receive = (event: MessageEvent) => {
    const message = event.data;
    if (message?.kind === "probe") {
      for (const id of getRecommendationGate(client).pending) publish({ kind: "begin", id });
      return;
    }
    if ((message?.kind !== "begin" && message?.kind !== "end") || typeof message.id !== "string" || message.id.length > 100) return;
    const pending = new Set(getRecommendationGate(client).remotePending);
    if (message.kind === "begin") pending.add(message.id);
    else pending.delete(message.id);
    void advance(client, { remotePending: [...pending] });
  };
  publishers.set(client, publish);
  channel?.addEventListener("message", receive);
  channel?.addEventListener("messageerror", unavailable);
  void advance(client, { available: channel !== null, active });
  publish({ kind: "probe" });
  return {
    setActive(value: boolean) { void advance(client, { active: value }); },
    disconnect() {
      publishers.delete(client);
      channel?.removeEventListener("message", receive);
      channel?.removeEventListener("messageerror", unavailable);
      void advance(client, { available: false, active: false });
    },
  };
}
