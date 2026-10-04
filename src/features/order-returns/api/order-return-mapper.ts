import type { OrderReturnResponseDto } from "@/features/order-returns/api/order-return-dto";
import type { OrderReturnRequest } from "@/features/order-returns/types/order-return.types";

export function mapOrderReturnResponse(
  response: OrderReturnResponseDto,
): OrderReturnRequest {
  const request = response.data;
  return {
    id: String(request.id),
    orderId: String(request.order_id),
    orderNumber: request.order_number,
    status: request.status,
    reason: request.reason,
    comment: request.comment,
    decisionNote: request.decision_note,
    decidedAt: request.decided_at,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
  };
}
