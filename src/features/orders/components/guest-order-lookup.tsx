"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { FieldFeedback } from "@/components/ui/field";
import { InputField } from "@/components/ui/input";
import { SaudiMobileField } from "@/components/ui/saudi-mobile-field";
import { GuestOrderResult } from "@/features/orders/components/guest-order-result";
import type { OrderDetailsContentCopy } from "@/features/orders/components/order-details-content";
import { lookupGuestOrderFromBrowser } from "@/features/orders/api/guest-order-lookup";
import type { GuestOrderLookupMethod } from "@/features/orders/types/guest-order-lookup.types";
import type { OrderDetails } from "@/features/orders/types/order.types";
import { parseGuestOrderLookupInput } from "@/features/orders/utils/guest-order-lookup-contract";
import type { Locale } from "next-intl";

type FieldErrors = Readonly<{
  identity?: "invalidEmail" | "invalidPhone";
  orderNumber?: "invalidOrderNumber";
}>;

export function GuestOrderLookup() {
  const locale = useLocale() as Locale;
  const t = useTranslations("Common.guestOrderTracking");
  const details = useTranslations("Account.orders.details");
  const orderNumberRef = useRef<HTMLInputElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const submittingRef = useRef(false);
  const [method, setMethod] = useState<GuestOrderLookupMethod>("email");
  const [orderNumber, setOrderNumber] = useState("");
  const [identities, setIdentities] = useState({ email: "", phone: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [responseError, setResponseError] = useState<"rateLimited" | "mismatch" | "service">();
  const [pending, setPending] = useState(false);
  const [order, setOrder] = useState<OrderDetails>();

  const detailCopy: OrderDetailsContentCopy = {
    orderLabel: details("orderLabel"),
    placedAt: (date) => details("placedAt", { date }),
    statusLabels: {
      new: details("currentStatus.new"),
      confirmed: details("currentStatus.confirmed"),
      processing: details("currentStatus.processing"),
      shipped: details("currentStatus.shipped"),
      delivered: details("currentStatus.delivered"),
      cancelled: details("currentStatus.cancelled"),
      returned: details("currentStatus.returned"),
      payment_failed: details("currentStatus.paymentFailed"),
    },
    timeline: {
      title: details("timeline.title"),
      reached: details("timeline.reachedState"),
      pending: details("timeline.pendingState"),
      stageLabels: {
        confirmed: details("timeline.confirmed"),
        processing: details("timeline.processing"),
        shipped: details("timeline.shipped"),
        delivered: details("timeline.delivered"),
        cancelled: details("timeline.cancelled"),
        returned: details("timeline.returned"),
      },
    },
    products: {
      title: details("itemsTitle"),
      quantity: (count) => details("quantity", { count }),
      unitPrice: details("unitPrice"),
      attributeLabels: {
        size: details("attributes.size"),
        color: details("attributes.color"),
      },
    },
    shipping: {
      title: details("shippingAddress"),
      recipient: details("shippingRecipient"),
      address: details("shippingAddressLabel"),
      phone: details("shippingPhone"),
      method: details("shippingMethod"),
    },
    payment: {
      title: details("paymentTitle"),
      method: details("paymentMethod"),
      status: details("paymentStatus"),
      paidAt: details("paidAt"),
      total: details("total"),
      methodLabels: {
        card: details("paymentMethods.card"),
        mada: details("paymentMethods.mada"),
        "credit-card": details("paymentMethods.creditCard"),
      },
      statusLabels: { paid: details("paymentStatuses.paid") },
    },
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const rawOrderNumber = orderNumber.trim();
    const identityIsValid = Boolean(
      parseGuestOrderLookupInput({
        orderNumber: "validation-only",
        method,
        identity: identities[method],
      }),
    );
    const input = parseGuestOrderLookupInput({
      orderNumber: rawOrderNumber,
      method,
      identity: identities[method],
    });
    const nextErrors: FieldErrors = {
      ...(!rawOrderNumber || rawOrderNumber.length > 100
        ? { orderNumber: "invalidOrderNumber" }
        : {}),
      ...(!identityIsValid
        ? {
            identity:
              method === "email"
                ? "invalidEmail"
                : "invalidPhone",
          }
        : {}),
    };
    if (!input || nextErrors.orderNumber) {
      setFieldErrors(nextErrors);
      return;
    }

    submittingRef.current = true;
    setPending(true);
    setFieldErrors({});
    setResponseError(undefined);
    try {
      const result = await lookupGuestOrderFromBrowser(locale, input);
      if (!result.ok) {
        setResponseError(
          result.code === "rate-limited"
            ? "rateLimited"
            : result.code === "lookup-mismatch"
              ? "mismatch"
              : "service",
        );
        return;
      }
      setOrder(result.order);
      requestAnimationFrame(() => resultHeadingRef.current?.focus());
    } catch {
      setResponseError("service");
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  };

  if (order) {
    return (
      <GuestOrderResult
        order={order}
        locale={locale}
        copy={detailCopy}
        headingRef={resultHeadingRef}
        changeDetailsLabel={t("changeDetails")}
        onChangeDetails={() => {
          setOrder(undefined);
          setResponseError(undefined);
          requestAnimationFrame(() => orderNumberRef.current?.focus());
        }}
      />
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="mx-auto max-w-xl rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-7"
    >
      <fieldset disabled={pending} className="space-y-5">
        <legend className="type-label text-gray-600">{t("methodLabel")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["email", "phone"] as const).map((option) => (
            <label key={option} className="relative cursor-pointer">
              <input
                type="radio"
                name="lookup-method"
                value={option}
                checked={method === option}
                onChange={() => {
                  setMethod(option);
                  setFieldErrors({});
                  setResponseError(undefined);
                }}
                className="peer sr-only"
              />
              <span className="flex min-h-11 items-center justify-center rounded-md border border-gray-200 px-3 type-body peer-checked:border-gold-500 peer-checked:bg-gold-50 peer-checked:font-bold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-500">
                {t(`methods.${option}`)}
              </span>
            </label>
          ))}
        </div>

        <InputField

          feedbackMessages={[t("errors.invalidOrderNumber")]}
          ref={orderNumberRef}
          id="guest-order-number"
          name="orderNumber"
          type="text"
          autoComplete="off"
          maxLength={100}
          required
          label={t("orderNumber")}
          value={orderNumber}
          error={fieldErrors.orderNumber ? t(`errors.${fieldErrors.orderNumber}`) : undefined}
          onChange={(event) => {
            setOrderNumber(event.target.value);
            setFieldErrors((current) => ({ ...current, orderNumber: undefined }));
            setResponseError(undefined);
          }}
        />

        {method === "email" ? (
          <InputField
            feedbackMessages={[t("errors.invalidEmail")]}
            id="guest-order-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            label={t("email")}
            value={identities.email}
            error={fieldErrors.identity ? t(`errors.${fieldErrors.identity}`) : undefined}
            onChange={(event) => {
              setIdentities((current) => ({ ...current, email: event.target.value }));
              setFieldErrors((current) => ({ ...current, identity: undefined }));
              setResponseError(undefined);
            }}
          />
        ) : (
          <SaudiMobileField
            feedbackMessages={[t("errors.invalidPhone")]}
            id="guest-order-phone"
            name="phone"
            maxLength={20}
            required
            label={t("phone")}
            value={identities.phone}
            error={fieldErrors.identity ? t(`errors.${fieldErrors.identity}`) : undefined}
            onChange={(event) => {
              setIdentities((current) => ({ ...current, phone: event.target.value }));
              setFieldErrors((current) => ({ ...current, identity: undefined }));
              setResponseError(undefined);
            }}
          />
        )}

        <FieldFeedback role="alert" reserve={[t("errors.rateLimited"), t("errors.mismatch"), t("errors.service")]}>
            {responseError ? t(`errors.${responseError}`) : null}
          </FieldFeedback>
        <p className="sr-only" role="status" aria-live="polite">
          {pending ? t("tracking") : ""}
        </p>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={pending}
          loadingLabel={t("tracking")}
        >
          {t("submit")}
        </Button>
      </fieldset>
    </form>
  );
}
