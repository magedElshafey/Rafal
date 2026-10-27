"use client";

import { use, useId } from "react";
import { ApplePayIcon, BankIcon, MadaIcon, VisaIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckoutStepSection } from "@/features/checkout/components/checkout-step-section";
import type { CheckoutPaymentDiscovery } from "@/features/checkout/types/checkout.types";
import { canSelectCheckoutPayment, isCheckoutPaymentCode, type CheckoutPaymentCode } from "@/features/checkout/utils/checkout-payment-presentation";
import { cn } from "@/lib/utils";

export type CheckoutPaymentCopy = {
  title: string;
  notice: string;
  submissionNotice: string;
  selectionUnavailable: string;
  loading: string;
  unavailable: string;
  empty: string;
  disabled: string;
  methods: Record<CheckoutPaymentCode, { label: string; description: string }>;
};

type Props = {
  copy: CheckoutPaymentCopy;
  step: string;
  selectedCode: CheckoutPaymentCode | null;
  onSelect: (code: CheckoutPaymentCode) => void;
};

const icons = { card: MadaIcon, apple_pay: ApplePayIcon, bank_transfer: BankIcon, tap: VisaIcon };

export function CheckoutPaymentLoading({ copy, step }: Pick<Props, "copy" | "step">) {
  return (
    <CheckoutStepSection id="checkout-payment" step={step} title={copy.title}>
      <div role="status" aria-busy="true" className="space-y-3">
        <span className="sr-only">{copy.loading}</span>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </CheckoutStepSection>
  );
}

export function CheckoutPaymentSection({ copy, step, discovery, selectedCode, onSelect }: Props & { discovery: CheckoutPaymentDiscovery }) {
  const id = useId();
  const methods = discovery.kind === "ready"
    ? discovery.methods.filter((method) => isCheckoutPaymentCode(method.code) && method.code !== "bank_transfer")
    : [];
  return (
    <CheckoutStepSection id="checkout-payment" step={step} title={copy.title}>
      <p id={`${id}-notice`} className="mb-4 type-body-sm text-gray-600">{copy.notice}</p>
      {discovery.kind === "unavailable" ? (
        <p role="status" className="type-body text-gray-600">{copy.unavailable}</p>
      ) : methods.length === 0 ? (
        <p role="status" className="type-body text-gray-600">{copy.empty}</p>
      ) : (
        <fieldset aria-describedby={`${id}-notice`}>
          <legend className="sr-only">{copy.title}</legend>
          <div className="grid gap-3">
            {methods.map((method) => {
              if (!isCheckoutPaymentCode(method.code)) return null;
              const code = method.code;
              const enabled = canSelectCheckoutPayment(code, true);
              const selected = enabled && selectedCode === code;
              const Icon = icons[code];
              const descriptionId = `${id}-${code}-description`;
              return (
                <label key={code} className={cn(
                  "flex items-center gap-3 rounded-md border p-4 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                  selected ? "border-gold-500 bg-gold-50/40" : "border-gray-200",
                  enabled ? "cursor-pointer" : "cursor-not-allowed bg-gray-50",
                )}>
                  <input
                    type="radio" name={`${id}-payment-method`} value={code}
                    checked={selected} disabled={!enabled}
                    aria-describedby={descriptionId}
                    className="size-4 shrink-0 accent-gray-900"
                    onChange={() => { if (enabled) onSelect(code); }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block type-body font-medium text-gray-1000">{copy.methods[code].label}</span>
                    <span id={descriptionId} className="mt-1 block type-caption text-gray-600">
                      {copy.methods[code].description}{!enabled ? ` — ${copy.disabled}` : ""}
                    </span>
                  </span>
                  <Icon aria-hidden="true" className="h-6 w-10 shrink-0" />
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </CheckoutStepSection>
  );
}

export function CheckoutPaymentRead({ discovery, ...props }: Props & { discovery: Promise<CheckoutPaymentDiscovery> }) {
  return <CheckoutPaymentSection {...props} discovery={use(discovery)} />;
}
