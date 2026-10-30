import Image from "next/image";
import { InfoIcon } from "@/components/ui/icons";

type ProductBnplInformationProps = {
  informationLabel: string;
  message: string;
  tabbyLabel: string;
  tamaraLabel: string;
};

export function ProductBnplInformation({
  informationLabel,
  message,
  tabbyLabel,
  tamaraLabel,
}: ProductBnplInformationProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md bg-gray-50 p-4 type-body-sm text-gray-700">
      <span className="flex min-w-0 flex-1 basis-48 items-start gap-2">
      <InfoIcon aria-hidden="true" className="size-4 shrink-0" />
      <span>{message}</span>
      </span>
      <span
        className="flex items-center gap-3"
        dir="ltr"
        aria-label={`${informationLabel}: ${tabbyLabel}, ${tamaraLabel}`}
        role="img"
      >
        <Image src="/images/payment/tabby.svg" alt="" width={448} height={122} className="h-5 w-auto" />
        <Image src="/images/payment/tamara.png" alt="" width={1135} height={368} sizes="74px" className="h-6 w-auto" />
      </span>
    </div>
  );
}
