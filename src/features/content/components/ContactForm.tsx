import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputField } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ContactFormCopy = {
  title: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  subjectLabel: string;
  subjectPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  submit: string;
  notice: string;
};

export function ContactForm({ copy }: { copy: ContactFormCopy }) {
  return (
    <form className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-7" aria-describedby="contact-form-notice">
      <fieldset>
        <legend className="mb-5 text-h3 font-bold text-gray-1000">{copy.title}</legend>
        <div className="space-y-4">
          <InputField id="contact-name" name="name" label={copy.nameLabel} placeholder={copy.namePlaceholder} autoComplete="name" required />
          <InputField id="contact-email" name="email" type="email" label={copy.emailLabel} placeholder={copy.emailPlaceholder} autoComplete="email" required />
          <InputField id="contact-subject" name="subject" label={copy.subjectLabel} placeholder={copy.subjectPlaceholder} required />
          <Field>
            <FieldLabel htmlFor="contact-message">{copy.messageLabel}</FieldLabel>
            <Textarea
              id="contact-message"
              name="message"
              rows={5}
              required
              placeholder={copy.messagePlaceholder}
            />
          </Field>
        </div>
      </fieldset>
      <Button type="button" size="lg" className="mt-5 w-full">{copy.submit}</Button>
      <p id="contact-form-notice" className="mt-3 text-center type-caption text-gray-400">{copy.notice}</p>
    </form>
  );
}

