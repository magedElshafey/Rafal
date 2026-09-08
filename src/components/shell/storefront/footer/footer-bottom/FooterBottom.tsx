import { Container } from "@/components/ui/container";

interface FooterBottomProps {
  copyright: string;
  paymentMethods: string;
}

export default function FooterBottom({
  copyright,
  paymentMethods,
}: FooterBottomProps) {
  return (
    <div className="border-t border-gray-800">
      <Container className="flex flex-col gap-2 py-4 type-body-sm text-gray-400 md:flex-row md:items-center md:justify-between xl:px-[var(--footer-desktop-padding-inline)]">
        <p>{paymentMethods}</p>
        <p>{copyright}</p>
      </Container>
    </div>
  );
}
