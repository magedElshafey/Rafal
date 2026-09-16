"use client";

import { useOptimistic, useTransition } from "react";
import type { Locale } from "next-intl";

import { Switch } from "@/components/ui/switch";
import {
  setOrderNotificationsPreference,
  setReceiveOffersPreference,
} from "@/features/account/settings/actions/set-account-preferences";
import type { AccountPreferences } from "@/features/account/settings/types/account-preferences.types";
import { rafalToast } from "@/lib/rafal-toast";
import { cn } from "@/lib/utils";

type PreferenceKey = keyof AccountPreferences;

type PreferenceCopy = {
  description: string;
  label: string;
};

export type AccountPreferencesSectionCopy = {
  mutationError: string;
  offers: PreferenceCopy;
  orderUpdates: PreferenceCopy;
  pending: string;
  title: string;
};

type AccountPreferencesSectionProps = {
  copy: AccountPreferencesSectionCopy;
  locale: Locale;
  preferences: AccountPreferences;
};

type OptimisticUpdate = {
  enabled: boolean;
  preference: PreferenceKey;
};

export function AccountPreferencesSection({
  copy,
  locale,
  preferences,
}: AccountPreferencesSectionProps) {
  const [pending, startTransition] = useTransition();
  const [optimisticPreferences, setOptimisticPreference] = useOptimistic(
    preferences,
    (current: AccountPreferences, update: OptimisticUpdate) => ({
      ...current,
      [update.preference]: update.enabled,
    }),
  );

  const updatePreference = (preference: PreferenceKey, enabled: boolean) => {
    startTransition(async () => {
      setOptimisticPreference({ preference, enabled });

      try {
        const result =
          preference === "receiveOrderUpdates"
            ? await setOrderNotificationsPreference({ locale, enabled })
            : await setReceiveOffersPreference({ locale, enabled });

        if (!result.ok) rafalToast.error(copy.mutationError);
      } catch {
        rafalToast.error(copy.mutationError);
      }
    });
  };

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

      <fieldset disabled={pending} aria-busy={pending || undefined}>
        <legend className="sr-only">{copy.title}</legend>
        <PreferenceRow
          copy={copy.orderUpdates}
          checked={optimisticPreferences.receiveOrderUpdates}
          onCheckedChange={(enabled) =>
            updatePreference("receiveOrderUpdates", enabled)
          }
        />
        <PreferenceRow
          copy={copy.offers}
          checked={optimisticPreferences.receiveOffers}
          onCheckedChange={(enabled) =>
            updatePreference("receiveOffers", enabled)
          }
          className="border-t border-gray-200"
        />
      </fieldset>

      <span className="sr-only" aria-live="polite">
        {pending ? copy.pending : ""}
      </span>
    </section>
  );
}

type PreferenceRowProps = {
  checked: boolean;
  className?: string;
  copy: PreferenceCopy;
  onCheckedChange: (checked: boolean) => void;
};

function PreferenceRow({
  checked,
  className,
  copy,
  onCheckedChange,
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
        <p className="mt-1 type-body-sm text-gray-400">{copy.description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={copy.label}
      />
    </div>
  );
}
