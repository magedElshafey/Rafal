import { InfoIcon, TabbyIcon, TamaraIcon } from "@/components/ui/icons";

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
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 type-body-sm text-gray-600">
      <InfoIcon aria-hidden="true" className="size-4 shrink-0" />
      <span>{message}</span>
      <span
        className="flex items-center gap-2"
        aria-label={`${informationLabel}: ${tabbyLabel}, ${tamaraLabel}`}
        role="img"
      >
        <TabbyIcon className="h-5 w-auto" />
        <TamaraIcon className="h-5 w-auto" />
      </span>
    </div>
  );
}
