import { getTranslations } from "next-intl/server";

import {
  AddressForm,
  type AddressFormCopy,
} from "@/features/addresses/components/address-form";
import { AddressLocationPicker } from "@/features/addresses/components/address-location-picker";
import { emptyAddressInput } from "@/features/addresses/constants/address.constants";
import type {
  AddressInput,
  AddressValidationError,
  SavedAddress,
} from "@/features/addresses/types/saved-address.types";

type AddressEditorProps =
  | {
      mode: "create";
      address?: never;
    }
  | {
      mode: "edit";
      address: SavedAddress;
    };

export async function AddressEditor(props: AddressEditorProps) {
  const t = await getTranslations("Account.addresses");
  const title =
    props.mode === "create" ? t("newTitle") : t("editTitle");
  const initialValues: AddressInput =
    props.mode === "edit"
      ? {
          fullName: props.address.fullName,
          phone: props.address.phone,
          city: props.address.city,
          district: props.address.district,
          street: props.address.street,
          additionalDetails: props.address.additionalDetails,
          postalCode: props.address.postalCode,
          type: props.address.type,
          isDefault: props.address.isDefault,
        }
      : { ...emptyAddressInput };
  const formModeProps =
    props.mode === "create"
      ? ({ mode: "create" } as const)
      : ({ mode: "edit", addressId: props.address.id } as const);
  const validation: Record<AddressValidationError, string> = {
    required: t("validation.required"),
    phone: t("validation.phone"),
    postalCode: t("validation.postalCode"),
    type: t("validation.type"),
    invalid: t("validation.invalid"),
  };
  const copy: AddressFormCopy = {
    sectionTitle: t("form.sectionTitle"),
    fields: {
      fullName: t("form.fields.fullName"),
      phone: t("form.fields.phone"),
      city: t("form.fields.city"),
      district: t("form.fields.district"),
      street: t("form.fields.street"),
      additionalDetails: t("form.fields.additionalDetails"),
      postalCode: t("form.fields.postalCode"),
      postalCodeOptional: t("form.fields.postalCodeOptional"),
    },
    type: {
      label: t("form.type.label"),
      home: t("types.home"),
      work: t("types.work"),
    },
    isDefault: t("form.isDefault"),
    save: t("form.save"),
    saving: t("form.saving"),
    cancel: t("form.cancel"),
    savedPreview: t("feedback.savedPreview"),
    saveError: t("feedback.saveError"),
    maximumReached: t("feedback.maximumReached"),
    validation,
  };

  return (
    <div>
      <h1 className="text-h2 font-bold text-gray-1000">
        {title}
      </h1>
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,1fr)]">
        <AddressForm
          {...formModeProps}
          copy={copy}
          initialValues={initialValues}
        />
        <AddressLocationPicker
          title={t("location.title")}
          description={t("location.description")}
          unavailable={t("location.unavailable")}
        />
      </div>
    </div>
  );
}
