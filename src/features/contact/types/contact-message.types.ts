export const contactFields = ["name", "email", "phone", "subject", "message"] as const;

export type ContactField = (typeof contactFields)[number];
export type ContactMessageInput = Record<ContactField, string>;
export type ContactFieldErrors = Partial<Record<ContactField, "invalid">>;
export type ContactErrorCode = "validation-error" | "rate-limited" | "service-failure";
export type ContactMessageResult =
  | { ok: true }
  | { ok: false; code: ContactErrorCode; fieldErrors?: ContactFieldErrors };

export type ContactFormCopy = {
  title: string;
  required: string;
  labels: Record<ContactField, string>;
  validation: Record<ContactField, string>;
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  sendAnother: string;
  errors: Record<ContactErrorCode, string>;
};
