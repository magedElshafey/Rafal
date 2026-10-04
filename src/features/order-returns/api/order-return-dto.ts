import type {
  OrderReturnReason,
  OrderReturnStatus,
} from "@/features/order-returns/types/order-return.types";

export type OrderReturnRequestDto = Readonly<{
  id: number;
  order_id: number;
  order_number: string;
  status: OrderReturnStatus;
  reason: OrderReturnReason;
  comment: string | null;
  decision_note: string | null;
  decided_by_admin_id: number | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}>;

export type OrderReturnResponseDto = Readonly<{
  success: true;
  data: OrderReturnRequestDto;
}>;

export type CreateOrderReturnDto = Readonly<{
  reason: OrderReturnReason;
}>;
