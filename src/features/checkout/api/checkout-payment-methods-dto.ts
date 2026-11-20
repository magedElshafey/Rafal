export type CheckoutBnpl = Readonly<{
  available: boolean;
  reason: string | null;
  min_amount: string;
  max_amount: string;
  instalments: number;
  instalment_amount: string | null;
}>;

export type CheckoutPaymentMethodsResponseDto = {
  success: boolean;
  message: string;
  data: Record<string, { label: string; icon: string; bnpl?: CheckoutBnpl | null }>;
};
