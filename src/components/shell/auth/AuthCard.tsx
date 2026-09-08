import type { ReactNode } from "react";

type AuthCardProps = {
  children: ReactNode;
  className?: string;
};

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <section
      className={`w-full max-w-[var(--auth-card-width)] self-start rounded-xl bg-background px-4 py-8 shadow-[var(--shadow-auth-card)] sm:px-6 ${className ?? ""}`}
    >
      {children}
    </section>
  );
}
