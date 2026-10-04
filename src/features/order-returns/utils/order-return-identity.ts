export class OrderReturnIdentityMismatchError extends Error {
  constructor() {
    super("The Return Request response belongs to a different Order.");
    this.name = "OrderReturnIdentityMismatchError";
  }
}

export function assertOrderReturnIdentity(
  expectedOrderNumber: string,
  actualOrderNumber: string,
): void {
  if (expectedOrderNumber !== actualOrderNumber) {
    throw new OrderReturnIdentityMismatchError();
  }
}
