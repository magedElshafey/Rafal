"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { connectRecommendationLifecycle } from "@/features/cart/api/cart-recommendation-lifecycle";

type QueryProviderProps = {
  children: ReactNode;
};

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof globalThis.crypto?.randomUUID === "function") {
        channel = new BroadcastChannel("rafal-recommendation-transitions");
      }
    } catch { /* Fail closed. */ }
    const active = () => document.visibilityState === "visible" && document.hasFocus();
    const connection = connectRecommendationLifecycle(queryClient, channel, active());
    const reconcile = () => connection.setActive(active());
    window.addEventListener("focus", reconcile);
    window.addEventListener("blur", reconcile);
    document.addEventListener("visibilitychange", reconcile);
    return () => {
      window.removeEventListener("focus", reconcile);
      window.removeEventListener("blur", reconcile);
      document.removeEventListener("visibilitychange", reconcile);
      connection.disconnect();
      channel?.close();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
