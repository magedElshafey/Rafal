import { Button } from "@/components/ui/button";
import { CheckIcon, InfoIcon, MapPinIcon } from "@/components/ui/icons";
import type { Address } from "@/features/addresses/types/address.types";
import { formatSaudiMobileForDisplay } from "@/lib/phone/saudi-mobile";
import { cn } from "@/lib/utils";

export type AddressCardCopy = {
  defaultLabel: string;
  delete: string;
  deleteLabel: string;
  edit: string;
  editLabel: string;
  recipient: string;
  serviceable: string;
  notServiceable: string;
};

type AddressCardProps = {
  address: Address;
  copy: AddressCardCopy;
  deletePending: boolean;
  onDelete: (address: Address, trigger: HTMLButtonElement) => void;
  onEdit: (address: Address, trigger: HTMLButtonElement) => void;
};

export function AddressCard({
  address,
  copy,
  deletePending,
  onDelete,
  onEdit,
}: AddressCardProps) {
  return (
    <article className="flex min-w-0 flex-col rounded-lg border border-gray-200 bg-gray-0 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="type-body-lg font-bold text-gray-1000">
              {address.label}
            </h2>
            {address.isDefault ? (
              <span className="inline-flex min-h-5 items-center rounded-full bg-gold-50 px-2 type-caption font-medium text-gold-700">
                {copy.defaultLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-2 type-body-sm text-gray-600">
            <span className="sr-only">{copy.recipient}: </span>
            {address.recipientName}
            {" | "}
            <bdi dir="ltr">
              {formatSaudiMobileForDisplay(address.recipientPhone)}
            </bdi>
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 type-caption font-medium",
            address.isServiceable
              ? "bg-success/10 text-success"
              : "bg-gold-50 text-gold-700",
          )}
        >
          {address.isServiceable ? (
            <CheckIcon aria-hidden="true" className="size-3.5" />
          ) : (
            <InfoIcon aria-hidden="true" className="size-3.5" />
          )}
          {address.isServiceable ? copy.serviceable : copy.notServiceable}
        </span>
      </div>

      <address className="mt-5 flex min-w-0 gap-2.5 type-body text-gray-600 not-italic">
        <MapPinIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gray-400" />
        <span className="min-w-0">
          <span className="block font-medium text-gray-800">
            {address.city.name}, {address.city.region.name}
          </span>
          <span className="mt-1 block break-words">
            {address.district}, {address.streetDetails}
          </span>
        </span>
      </address>

      <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-100 pt-4">
        <Button
          variant="outline"
          size="sm"
          aria-label={copy.editLabel.replace("{label}", address.label)}
          onClick={(event) => onEdit(address, event.currentTarget)}
        >
          {copy.edit}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          aria-label={copy.deleteLabel.replace("{label}", address.label)}
          disabled={deletePending}
          onClick={(event) => onDelete(address, event.currentTarget)}
        >
          {copy.delete}
        </Button>
      </div>
    </article>
  );
}
