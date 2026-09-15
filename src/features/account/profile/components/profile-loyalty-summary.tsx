import { CrownIcon } from "@/components/ui/icons";

type ProfileLoyaltySummaryProps = {
  description: string;
  title: string;
};

export function ProfileLoyaltySummary({
  description,
  title,
}: ProfileLoyaltySummaryProps) {
  return (
    <section className="flex items-center justify-between gap-5 rounded-lg border border-gold-100 bg-gold-50 px-6 py-7">
      <div>
        <h2 className="type-body-lg font-bold text-gray-1000">{title}</h2>
        <p className="mt-1 type-body-sm text-gray-500">{description}</p>
      </div>
      <CrownIcon aria-hidden="true" className="size-6 shrink-0 text-gold-500" />
    </section>
  );
}
