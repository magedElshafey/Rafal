export class OrderIdentityMismatchError extends Error {
  constructor() {
    super("The cancelled order response did not match the requested order.");
    this.name = "OrderIdentityMismatchError";
  }
}

export function assertCancelledOrderIdentity(
  requestedOrderNumber: string,
  responseOrderNumber: string,
): void {
  if (responseOrderNumber !== requestedOrderNumber) {
    throw new OrderIdentityMismatchError();
  }
}
