import { getLocale, getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { getAddresses } from "@/features/addresses/api/get-addresses";
import { AddressCard } from "@/features/addresses/components/address-card";
import type { DeleteAddressCopy } from "@/features/addresses/components/delete-address-button";
import { MAX_SAVED_ADDRESSES } from "@/features/addresses/constants/address.constants";
import type { AddressType } from "@/features/addresses/types/saved-address.types";
import { Link } from "@/i18n/navigation";

export default async function AddressesPage() {
  const [addresses, locale, t] = await Promise.all([
    getAddresses(),
    getLocale(),
    getTranslations("Account.addresses"),
  ]);
  const canAddAddress = addresses.length < MAX_SAVED_ADDRESSES;
  const typeLabels: Record<AddressType, string> = {
    home: t("types.home"),
    work: t("types.work"),
  };
  const deleteCopy: DeleteAddressCopy = {
    trigger: t("delete.trigger"),
    title: t("delete.title"),
    description: t("delete.description"),
    confirm: t("delete.confirm"),
    confirming: t("delete.confirming"),
    cancel: t("delete.cancel"),
    deletedPreview: t("feedback.deletedPreview"),
    defaultUnsupported: t("feedback.defaultDeleteUnsupported"),
    error: t("feedback.deleteError"),
  };
  const addAddressLink = (
    <Link href="/account/addresses/new" className={buttonVariants()}>
      <PlusIcon aria-hidden="true" className="size-4" />
      {t("add")}
    </Link>
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-h2 font-bold text-gray-1000">{t("title")}</h1>
          <p className="mt-3 type-body text-gray-400">
            {t("helper", {
              count: addresses.length,
              maximum: MAX_SAVED_ADDRESSES,
            })}
          </p>
        </div>
        {canAddAddress ? (
          addAddressLink
        ) : (
          <span className="inline-flex h-11 items-center rounded-md bg-gray-100 px-5 type-body font-medium text-gray-400">
            {t("maximumReached")}
          </span>
        )}
      </div>

      {addresses.length > 0 ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              locale={locale}
              typeLabels={typeLabels}
              defaultLabel={t("defaultLabel")}
              editLabel={t("edit")}
              deleteCopy={deleteCopy}
            />
          ))}
        </div>
      ) : (
        <section className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <h2 className="text-h4 font-medium text-gray-1000">
            {t("empty.title")}
          </h2>
          <p className="mt-2 type-body text-gray-600">
            {t("empty.description")}
          </p>
          <div className="mt-5 flex justify-center">{addAddressLink}</div>
        </section>
      )}
    </div>
  );
}
