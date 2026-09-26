import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type PreferenceCopy = {
  description: string;
  label: string;
};

export type AccountPreferencesSectionCopy = {
  offers: PreferenceCopy;
  orderUpdates: PreferenceCopy;
  title: string;
};

type AccountPreferencesSectionProps = {
  copy: AccountPreferencesSectionCopy;
};

export function AccountPreferencesSection({
  copy,
}: AccountPreferencesSectionProps) {
  return (
    <section
      aria-labelledby="account-notifications-title"
      className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-8"
    >
      <h2
        id="account-notifications-title"
        className="text-h3 font-bold text-gray-1000"
      >
        {copy.title}
      </h2>

      <fieldset disabled>
        <legend className="sr-only">{copy.title}</legend>
        <PreferenceRow
          copy={copy.orderUpdates}
          descriptionId="order-notifications-description"
        />
        <PreferenceRow
          copy={copy.offers}
          descriptionId="offers-notifications-description"
          className="border-t border-gray-200"
        />
      </fieldset>
    </section>
  );
}

type PreferenceRowProps = {
  className?: string;
  copy: PreferenceCopy;
  descriptionId: string;
};

function PreferenceRow({
  className,
  copy,
  descriptionId,
}: PreferenceRowProps) {
  return (
    <div
      className={cn(
        "flex min-h-20 items-center justify-between gap-5",
        className,
      )}
    >
      <div className="min-w-0 py-4">
        <p className="type-body font-medium text-gray-1000">{copy.label}</p>
        <p
          id={descriptionId}
          className="mt-1 type-body-sm text-gray-400"
        >
          {copy.description}
        </p>
      </div>
      <Switch
        checked={false}
        disabled
        aria-label={copy.label}
        aria-describedby={descriptionId}
      />
    </div>
  );
}
