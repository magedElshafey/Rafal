import type { ReactNode } from "react";

interface FooterTitleProps {
  children: ReactNode;
  id?: string;
}

export default function FooterTitle({ children, id }: FooterTitleProps) {
  return (
    <h2 id={id} className="type-body-lg font-bold text-gray-0">
      {children}
    </h2>
  );
}
