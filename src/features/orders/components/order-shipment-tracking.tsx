type OrderShipmentTrackingProps = {
  label: string;
  trackingNumber: string;
};

export function OrderShipmentTracking({
  label,
  trackingNumber,
}: OrderShipmentTrackingProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-7">
      <h2 className="type-body text-gray-500">{label}</h2>
      <p className="mt-2 type-body font-bold text-gray-1000">
        <bdi>{trackingNumber}</bdi>
      </p>
    </section>
  );
}
