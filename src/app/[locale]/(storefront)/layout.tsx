import type { ReactNode } from "react";

type StoreFontLayoutProps = {
  children: ReactNode;
};

export default async function StoreFontLayout({
  children,
}: StoreFontLayoutProps) {
  return (
    <>
      <h1>store font layout </h1>
      <main>{children}</main>
    </>
  );
}
