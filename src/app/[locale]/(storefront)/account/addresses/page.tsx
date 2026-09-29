import { getLocale, getTranslations } from "next-intl/server";

import {
  AddressPage,
  type AddressPageCopy,
} from "@/features/addresses/components/address-page";
import {
  getAddressPage,
  isRecoverableAddressListError,
} from "@/features/addresses/server/address-boundary";
import type { AddressPage as AddressPageData } from "@/features/addresses/types/address.types";
import { requireUser } from "@/features/auth/server/auth-boundary";
import { getPublicSettings } from "@/features/settings/server/public-settings-boundary";

async function getInitialAddressPage(
  locale: Awaited<ReturnType<typeof getLocale>>,
): Promise<AddressPageData | null> {
  try {
    return await getAddressPage(locale, 1);
  } catch (error) {
    if (isRecoverableAddressListError(error)) return null;
    throw error;
  }
}

export default async function AddressesPage() {
  const locale = await getLocale();
  await requireUser("/account/addresses", locale);

  const [initialPage, settings, t] = await Promise.all([
    getInitialAddressPage(locale),
    getPublicSettings(),
    getTranslations("Account.addresses"),
  ]);
  const copy: AddressPageCopy = {
    title: t("title"),
    helper: t.raw("helper") as string,
    maximumReached: t("maximumReached"),
    add: t("add"),
    loadMore: t("loadMore"),
    loading: t("loading"),
    loadingMore: t("loadingMore"),
    nextPageError: t("nextPageError"),
    retry: t("retry"),
    empty: {
      title: t("empty.title"),
      description: t("empty.description"),
    },
    error: {
      title: t("error.title"),
      description: t("error.description"),
    },
    card: {
      defaultLabel: t("card.defaultLabel"),
      delete: t("card.delete"),
      deleteLabel: t.raw("card.deleteLabel") as string,
      edit: t("card.edit"),
      editLabel: t.raw("card.editLabel") as string,
      recipient: t("card.recipient"),
      serviceable: t("card.serviceable"),
      notServiceable: t("card.notServiceable"),
    },
    form: {
      addTitle: t("form.addTitle"),
      editTitle: t("form.editTitle"),
      close: t("form.close"),
      fields: {
        label: t("form.fields.label"),
        recipientName: t("form.fields.recipientName"),
        recipientPhone: t("form.fields.recipientPhone"),
        city: t("form.fields.city"),
        district: t("form.fields.district"),
        streetDetails: t("form.fields.streetDetails"),
      },
      cityOptions: {
        select: t("form.cityOptions.select"),
        loading: t("form.cityOptions.loading"),
        empty: t("form.cityOptions.empty"),
        unavailable: t("form.cityOptions.unavailable"),
        unavailableCurrent: t("form.cityOptions.unavailableCurrent"),
        retry: t("form.cityOptions.retry"),
      },
      defaultAddress: {
        label: t("form.defaultAddress.label"),
        helper: t("form.defaultAddress.helper"),
      },
      save: t("form.save"),
      saving: t("form.saving"),
      cancel: t("form.cancel"),
      required: t("form.required"),
      rejected: t("form.rejected"),
      validationError: t("form.validationError"),
      serviceError: t("form.serviceError"),
      notFound: t("form.notFound"),
      created: t("form.created"),
      updated: t("form.updated"),
    },
    deleteDialog: {
      title: t("delete.title"),
      description: t.raw("delete.description") as string,
      confirm: t("delete.confirm"),
      confirming: t("delete.confirming"),
      cancel: t("delete.cancel"),
      success: t("delete.success"),
      error: t("delete.error"),
    },
  };

  return (
    <AddressPage
      copy={copy}
      initialPage={initialPage}
      locale={locale}
      maxAddresses={settings.maxAddressesPerUser}
    />
  );
}
