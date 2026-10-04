"use client";

import type { FormEvent } from "react";
import { useId, useRef, useState } from "react";
import type { Locale } from "next-intl";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { RafalModal } from "@/components/ui/rafal-modal";
import { createOrderReturnFromBrowser } from "@/features/order-returns/api/create-order-return";
import { OrderReturnSummaryCard } from "@/features/order-returns/components/order-return-summary-card";
import {
  orderReturnReasons,
  type OrderReturnCopy,
  type OrderReturnReason,
  type OrderReturnRequest,
} from "@/features/order-returns/types/order-return.types";
import { getOrderReturnReasonLabel } from "@/features/order-returns/utils/order-return-contract";
import { useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/api-error";

type ErrorKey = keyof OrderReturnCopy["errors"];

function errorKey(error: unknown): ErrorKey {
  if (!(error instanceof ApiError)) return "service";
  if (error.code === "unauthorized") return "auth";
  if (error.code === "invalid-reason") return "invalidReason";
  if (error.code === "not-allowed") return "notAllowed";
  if (error.code === "rate-limited") return "rateLimited";
  return "service";
}

export function OrderReturnAction({
  copy,
  locale,
  orderNumber,
}: {
  copy: OrderReturnCopy;
  locale: Locale;
  orderNumber: string;
}) {
  const router = useRouter();
  const fieldId = useId();
  const formId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const submissionPendingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<OrderReturnReason | "">("");
  const [pending, setPending] = useState(false);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<OrderReturnRequest | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (submissionPendingRef.current) return;
    setOpen(nextOpen);
    if (!nextOpen && submitted) {
      router.refresh();
      return;
    }
    if (!nextOpen && !submitted) {
      setReason("");
      setReasonError(null);
      setFormError(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionPendingRef.current) return;
    if (!reason) {
      setReasonError(copy.reasonRequired);
      setFormError(null);
      return;
    }

    submissionPendingRef.current = true;
    setPending(true);
    setReasonError(null);
    setFormError(null);

    try {
      const request = await createOrderReturnFromBrowser(
        locale,
        orderNumber,
        reason,
      );
      setSubmitted(request);
    } catch (submissionError) {
      const key = errorKey(submissionError);
      if (key === "invalidReason") {
        setReasonError(copy.errors.invalidReason);
      } else {
        setFormError(copy.errors[key]);
      }
    } finally {
      submissionPendingRef.current = false;
      setPending(false);
    }
  };

  return (
    <>
      {submitted ? (
        <span
          ref={statusRef}
          role="status"
          tabIndex={-1}
          className="inline-flex min-h-11 items-center rounded-md bg-gold-50 px-4 type-body-sm font-medium text-gold-700"
        >
          {copy.statuses.pending}
        </span>
      ) : (
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setOpen(true)}
        >
          {copy.action}
        </Button>
      )}

      <RafalModal
        open={open}
        onOpenChange={handleOpenChange}
        returnFocusRef={submitted ? statusRef : triggerRef}
        dismissible={!pending}
        title={submitted ? copy.successTitle : copy.title}
        description={
          submitted
            ? copy.successBody
            : `${copy.orderContextText} ${copy.description}`
        }
        footer={
          submitted ? (
            <Button
              type="button"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              {copy.close}
            </Button>
          ) : (
            <>
              <Button
                type="submit"
                form={formId}
                size="sm"
                loading={pending}
                loadingLabel={copy.submitting}
              >
                {copy.submit}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => handleOpenChange(false)}
              >
                {copy.cancel}
              </Button>
            </>
          )
        }
      >
        {submitted ? (
          <div className="pt-2" aria-live="polite">
            <OrderReturnSummaryCard
              copy={copy}
              headingLevel="h3"
              locale={locale}
              request={submitted}
            />
          </div>
        ) : (
          <form id={formId} onSubmit={handleSubmit} className="pt-2">
            <Field>
              <FieldLabel htmlFor={fieldId}>{copy.reasonLabel}</FieldLabel>
              <NativeSelect
                id={fieldId}
                name="reason"
                required
                value={reason}
                disabled={pending}
                invalid={Boolean(reasonError)}
                aria-describedby={
                  reasonError ? `${fieldId}-error` : undefined
                }
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  if (
                    value === "" ||
                    orderReturnReasons.includes(value as OrderReturnReason)
                  ) {
                    setReason(value as OrderReturnReason | "");
                    setReasonError(null);
                  }
                }}
              >
                <option value="" disabled>
                  {copy.reasonPlaceholder}
                </option>
                {orderReturnReasons.map((value) => (
                  <option key={value} value={value}>
                    {getOrderReturnReasonLabel(value, copy.reasons)}
                  </option>
                ))}
              </NativeSelect>
              {reasonError ? (
                <FieldError id={`${fieldId}-error`} role="alert">
                  {reasonError}
                </FieldError>
              ) : null}
            </Field>
            {formError ? (
              <p className="mt-3 type-body-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </form>
        )}
      </RafalModal>
    </>
  );
}
