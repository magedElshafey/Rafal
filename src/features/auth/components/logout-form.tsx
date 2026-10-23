"use client";

import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { logoutAccount } from "@/features/auth/actions/logout-account";
import { beginRecommendationTransition } from "@/features/cart/api/cart-recommendation-lifecycle";

export function LogoutForm({ children, className }: { children: ReactNode; className?: string }) {
  const client = useQueryClient();
  return <form className={className} action={async (data) => {
    const transition = beginRecommendationTransition(client);
    try {
      await transition.ready;
      await logoutAccount(data);
    } finally {
      transition.finish();
    }
  }}>{children}</form>;
}
