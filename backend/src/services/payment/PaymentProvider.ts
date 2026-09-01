export interface CreatePaymentInput {
  bookingId: string;
  bookingNumber: string;
  amount: number;
  currency: string;
  customerEmail: string;
}

export interface CreatePaymentResult {
  providerPaymentId: string;
  /** Opaque data the client uses to complete payment (redirect URL, client secret, etc). */
  clientSecret?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  raw?: unknown;
}

export interface VerifyPaymentInput {
  providerPaymentId: string;
}

export interface VerifyPaymentResult {
  providerPaymentId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount?: number;
  currency?: string;
  raw?: unknown;
}

export interface RefundPaymentInput {
  providerPaymentId: string;
  amount: number;
  reason?: string;
}

export interface RefundPaymentResult {
  refundId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  amount: number;
  raw?: unknown;
}

export interface PaymentStatusResult {
  providerPaymentId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
}

/**
 * Abstraction every concrete payment gateway (mock, Stripe, Razorpay, ...)
 * must implement. The booking/payment services depend only on this
 * interface, so swapping or adding a real gateway never requires touching
 * booking logic — only a new class here plus a line in the factory.
 */
export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult>;
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult>;
}
