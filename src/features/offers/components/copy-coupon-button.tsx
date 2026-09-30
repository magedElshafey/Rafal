"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyCouponButton({ code, label, accessibleLabel, copied, failed }: {
  code: string;
  label: string;
  accessibleLabel: string;
  copied: string;
  failed: string;
}) {
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"success" | "error" | null>(null);
  async function copy() {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setStatus(null);
    try {
      await navigator.clipboard.writeText(code);
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      locked.current = false;
      setPending(false);
    }
  }
  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        variant="outline"
        aria-label={accessibleLabel}
        loading={pending}
        loadingLabel={accessibleLabel}
        onClick={() => void copy()}
      >
        {label}
      </Button>
      <p role="status" aria-live="polite" className="min-h-5 type-caption text-gray-600">
        {status === "success" ? copied : status === "error" ? failed : null}
      </p>
    </div>
  );
}
