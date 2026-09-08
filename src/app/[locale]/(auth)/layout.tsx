import type { ReactNode } from "react";

import { AuthCard } from "@/components/shell/auth/AuthCard";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="min-h-dvh overflow-x-clip bg-gold-50 px-4 py-8 sm:flex sm:justify-center sm:px-6 sm:pt-[var(--auth-card-block-offset)]">
      <AuthCard>{children}</AuthCard>
    </main>
  );
}
