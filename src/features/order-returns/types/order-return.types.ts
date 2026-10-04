export const orderReturnReasons = [
  "damaged",
  "wrong_item",
  "not_as_described",
  "changed_mind",
  "other",
] as const;

export type OrderReturnReason = (typeof orderReturnReasons)[number];

export const orderReturnStatuses = [
  "pending",
  "approved",
  "rejected",
] as const;

export type OrderReturnStatus = (typeof orderReturnStatuses)[number];

export type OrderReturnRequest = Readonly<{
  id: string;
  orderId: string;
  orderNumber: string;
  status: OrderReturnStatus;
  reason: OrderReturnReason;
  comment: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type OrderReturnReasonLabels = Readonly<
  Record<OrderReturnReason, string>
>;

export type OrderReturnCopy = Readonly<{
  action: string;
  title: string;
  orderContextText: string;
  description: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  reasonRequired: string;
  reasons: OrderReturnReasonLabels;
  submit: string;
  submitting: string;
  cancel: string;
  close: string;
  successTitle: string;
  successBody: string;
  summaryTitle: string;
  requestDate: string;
  decisionDate: string;
  decisionNote: string;
  statuses: Readonly<Record<OrderReturnStatus, string>>;
  errors: Readonly<{
    auth: string;
    invalidReason: string;
    notAllowed: string;
    rateLimited: string;
    service: string;
  }>;
}>;

export type OrderReturnModuleState =
  | Readonly<{ kind: "create" }>
  | Readonly<{ kind: "existing"; request: OrderReturnRequest }>
  | Readonly<{ kind: "unavailable" }>;
