export type CheckoutPaymentMethodsResponseDto = {
  success: boolean;
  message: string;
  data: Record<string, { label: string; icon: string }>;
};
