"use client";

import { useRef, useState } from "react";
import { Copy } from "lucide-react";
import { useRafalToast } from "@/lib/rafal-toast";

import { Button } from "@/components/ui/button";

type CopyCouponButtonProps = {
  code: string;
  accessibleLabel: string;
  copied: string;
  failed: string;
};

export function CopyCouponButton({
  code,
  accessibleLabel,
  copied,
  failed,
}: CopyCouponButtonProps) {
  const rafalToast = useRafalToast();
  const locked = useRef(false);
  const [pending, setPending] = useState(false);

  async function copy() {
    if (locked.current) {
      return;
    }

    locked.current = true;
    setPending(true);

    try {
      await navigator.clipboard.writeText(code);

      rafalToast.success(copied, { id: `coupon-copy:${code}` });
    } catch {
      rafalToast.error(failed, { id: `coupon-copy:${code}` });
    } finally {
      locked.current = false;
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="size-9 shrink-0 p-0 text-gold-600 hover:text-gold-600"
      aria-label={accessibleLabel}
      title={accessibleLabel}
      loading={pending}
      loadingLabel={accessibleLabel}
      onClick={() => void copy()}
    >
      <Copy aria-hidden="true" className="size-4" />
    </Button>
  );
}
