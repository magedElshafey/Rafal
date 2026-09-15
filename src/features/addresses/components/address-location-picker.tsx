import { MapPinIcon } from "@/components/ui/icons";

type AddressLocationPickerProps = {
  description: string;
  title: string;
  unavailable: string;
};

export function AddressLocationPicker({
  description,
  title,
  unavailable,
}: AddressLocationPickerProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-8">
      <h2 className="text-h3 font-bold text-gray-1000">{title}</h2>
      <div className="relative mt-5 grid aspect-square max-h-80 grid-cols-3 overflow-hidden rounded-lg bg-success/10" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} className="border border-gray-0/80" />
        ))}
        <span className="absolute inset-0 flex items-center justify-center text-gray-1000">
          <MapPinIcon className="size-10" />
        </span>
      </div>
      <p className="mt-4 type-body text-gray-600">{description}</p>
      <p className="mt-2 type-caption text-gray-500">{unavailable}</p>
    </section>
  );
}
