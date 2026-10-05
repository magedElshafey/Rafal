"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { InputField } from "@/components/ui/input";
import { SaudiMobileField } from "@/components/ui/saudi-mobile-field";
import { Textarea } from "@/components/ui/textarea";
import { submitContactMessageFromBrowser } from "@/features/contact/api/contact-messages-api.client";
import {
  contactFields,
  type ContactErrorCode,
  type ContactField,
  type ContactFieldErrors,
  type ContactFormCopy,
} from "@/features/contact/types/contact-message.types";
import { validateContactMessage } from "@/features/contact/utils/contact-message-contract";

export function ContactForm({ copy }: { copy: ContactFormCopy }) {
  const locale = useLocale();
  const [state, setState] = useState<"idle" | "submitting" | "error" | "success">("idle");
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [formError, setFormError] = useState<ContactErrorCode | null>(null);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const anotherRef = useRef<HTMLButtonElement>(null);
  const resetFocus = useRef(false);
  const submitting = state === "submitting";

  useEffect(() => {
    if (state === "success") anotherRef.current?.focus();
    if (state === "idle" && resetFocus.current) {
      resetFocus.current = false;
      formRef.current?.querySelector<HTMLInputElement>("#contact-name")?.focus();
    }
    if (state === "error" && Object.keys(fieldErrors).length > 0) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state, fieldErrors]);

  const fieldError = (field: ContactField) => fieldErrors[field] ? copy.validation[field] : undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    const validation = validateContactMessage(Object.fromEntries(
      contactFields.map((field) => [field, data.get(field)]),
    ));
    setFormError(null);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setState("error");
      return;
    }

    inFlight.current = true;
    setFieldErrors({});
    setState("submitting");
    try {
      const result = await submitContactMessageFromBrowser(locale, validation.input);
      if (result.ok) {
        setState("success");
      } else {
        const errors = result.fieldErrors ?? {};
        setFieldErrors(errors);
        if (Object.keys(errors).length === 0) setFormError(result.code);
        setState("error");
      }
    } catch {
      setFormError("service-failure");
      setState("error");
    } finally {
      inFlight.current = false;
    }
  }

  function sendAnother() {
    setFieldErrors({});
    setFormError(null);
    resetFocus.current = true;
    setState("idle");
  }

  return (
    <div className="min-w-0 min-h-176 rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-7">
      <div role="status" aria-atomic="true">
        {state === "success" ? (
          <div className="space-y-3">
            <h2 className="text-h3 font-bold text-gray-1000">{copy.successTitle}</h2>
            <p className="type-body-lg text-muted-foreground">{copy.successBody}</p>
          </div>
        ) : null}
      </div>
      {state === "success" ? (
        <Button ref={anotherRef} variant="outline" className="mt-5 w-full sm:w-auto" onClick={sendAnother}>
          {copy.sendAnother}
        </Button>
      ) : (
        <form ref={formRef} method="post" noValidate onSubmit={handleSubmit} aria-describedby="contact-form-required">
          <fieldset disabled={submitting} className="min-w-0">
            <legend className="text-h3 font-bold text-gray-1000">{copy.title}</legend>
            <p id="contact-form-required" className="mt-2 type-body-sm text-muted-foreground">{copy.required}</p>
            <div className="mt-5 space-y-4">
              <InputField id="contact-name" name="name" label={copy.labels.name} autoComplete="name" dir="auto" required error={fieldError("name")} />
              <div className="min-w-0 space-y-4">
                <InputField id="contact-email" name="email" type="email" label={copy.labels.email} autoComplete="email" dir="ltr" required error={fieldError("email")} />
                <SaudiMobileField id="contact-phone" name="phone" label={copy.labels.phone} disabled={submitting} required error={fieldError("phone")} />
              </div>
              <InputField id="contact-subject" name="subject" label={copy.labels.subject} dir="auto" required error={fieldError("subject")} />
              <Field>
                <FieldLabel htmlFor="contact-message">{copy.labels.message}</FieldLabel>
                <Textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  dir="auto"
                  required
                  invalid={Boolean(fieldErrors.message)}
                  aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
                />
                {fieldErrors.message ? <FieldError id="contact-message-error">{copy.validation.message}</FieldError> : null}
              </Field>
            </div>
          </fieldset>
          {formError ? <p role="alert" className="mt-5 type-body text-destructive">{copy.errors[formError]}</p> : null}
          <Button type="submit" size="lg" loading={submitting} loadingLabel={copy.submitting} disabled={submitting} className="mt-5 w-full">
            {copy.submit}
          </Button>
        </form>
      )}
    </div>
  );
}
