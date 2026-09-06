import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

export default async function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <>
      <h1>auth layout </h1>
      <main>{children}</main>
    </>
  );
}
