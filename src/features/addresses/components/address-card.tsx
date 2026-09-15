import type { Locale } from "next-intl";

import {
  DeleteAddressButton,
  type DeleteAddressCopy,
} from "@/features/addresses/components/delete-address-button";
import type {
  AddressType,
  SavedAddress,
} from "@/features/addresses/types/saved-address.types";
import { formatSavedAddress } from "@/features/addresses/utils/format-address";
import { Link } from "@/i18n/navigation";

type AddressCardProps = {
  address: SavedAddress;
  defaultLabel: string;
  deleteCopy: DeleteAddressCopy;
  editLabel: string;
  locale: Locale;
  typeLabels: Record<AddressType, string>;
};

export function AddressCard({
  address,
  defaultLabel,
  deleteCopy,
  editLabel,
  locale,
  typeLabels,
}: AddressCardProps) {
  const title = address.displayLabel ?? typeLabels[address.type];

  return (
    <article className="rounded-lg border border-gray-200 bg-gray-0 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="type-body font-bold text-gray-1000">{title}</h2>
          {address.isDefault ? (
            <span className="inline-flex min-h-5 items-center rounded-full bg-gold-50 px-2 type-caption font-medium text-gold-700">
              {defaultLabel}
            </span>
          ) : null}
        </div>
        <Link
          href={`/account/addresses/${address.id}/edit`}
          className="inline-flex min-h-11 shrink-0 items-center rounded-sm type-body-sm text-gray-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {editLabel}
        </Link>
      </div>
      <address className="mt-3 type-body text-gray-500 not-italic">
        {formatSavedAddress(address, locale)}
      </address>
      <div className="mt-3">
        <DeleteAddressButton addressId={address.id} copy={deleteCopy} />
      </div>
    </article>
  );
}
