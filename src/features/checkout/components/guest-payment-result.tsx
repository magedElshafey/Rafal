"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "next-intl";
import { Button } from "@/components/ui/button";
import { PaymentResultView, type PaymentResultCopy } from "./payment-result-view";
import { readCheckoutVerificationHandoff } from "@/features/checkout/utils/checkout-handoff";
import { resolvePaymentResult, type PaymentResultState, type PaymentReturn } from "@/features/checkout/utils/payment-result";
import { lookupGuestOrderFromBrowser } from "@/features/orders/api/guest-order-lookup";
import { parseGuestOrderLookupInput } from "@/features/orders/utils/guest-order-lookup-contract";

export function GuestPaymentResult({ locale, paymentReturn, copy }: {
  locale: Locale;
  paymentReturn: PaymentReturn;
  copy: PaymentResultCopy;
}) {
  const [state, setState] = useState<PaymentResultState>("checking");
  const inFlight = useRef<AbortController | null>(null);
  const check = useCallback(async () => {
    if (inFlight.current) return;
    const controller = new AbortController();
    inFlight.current = controller;
    setState("checking");
    try {
      const handoff = readCheckoutVerificationHandoff(paymentReturn.orderNumber);
      const input = handoff && parseGuestOrderLookupInput({
        orderNumber: paymentReturn.orderNumber, method: "phone", identity: handoff.phone,
      });
      // Storage is only a lookup hint. Laravel still checks order ownership.
      if (!input) { setState("unavailable"); return; }
      const result = await lookupGuestOrderFromBrowser(locale, input, controller.signal);
      if (!controller.signal.aborted) setState(result.ok
        ? resolvePaymentResult(paymentReturn.orderNumber, result.order).state : "unavailable");
    } catch {
      if (!controller.signal.aborted) setState("unavailable");
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, [locale, paymentReturn.orderNumber]);

  useEffect(() => {
    // Defer to hydration; cleanup also prevents Strict Mode's discarded mount read.
    const timeout = window.setTimeout(() => { void check(); }, 0);
    return () => {
      window.clearTimeout(timeout);
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [check]);

  return (
    <PaymentResultView copy={copy} state={state} paymentReturn={paymentReturn}>
      <Button variant={state === "failed" ? "primary" : state === "confirmed" ? "ghost" : "outline"}
        size={state === "failed" ? "lg" : "md"} className="h-auto min-h-11 w-full whitespace-normal py-3" onClick={() => { void check(); }}
        loading={state === "checking"} loadingLabel={copy.states.checking.title}>
        {copy.recheck}
      </Button>
    </PaymentResultView>
  );
}
