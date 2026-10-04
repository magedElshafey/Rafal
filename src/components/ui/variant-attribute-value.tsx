import { cn } from "@/lib/utils";
import { resolveVariantColorSwatch } from "@/lib/variant-attributes";

type VariantColorSwatchProps = {
  className?: string;
  value: string;
};

export function VariantColorSwatch({
  className,
  value,
}: VariantColorSwatchProps) {
  const swatch = resolveVariantColorSwatch(value);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-5 shrink-0 rounded-full border border-gray-300 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_70%)]",
        className,
      )}
      style={{ backgroundColor: swatch.cssColor }}
    />
  );
}

type VariantAttributeValueProps = {
  attributeKey: string;
  attributeValue: string;
  className?: string;
};

export function VariantAttributeValue({
  attributeKey,
  attributeValue,
  className,
}: VariantAttributeValueProps) {
  if (attributeKey === "color") {
    return <VariantColorSwatch className={className} value={attributeValue} />;
  }

  return <span className={className}>{attributeValue}</span>;
}
