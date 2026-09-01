import { randomUUID } from 'crypto';
import {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatusResult,
  RefundPaymentInput,
  RefundPaymentResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from './PaymentProvider';

interface MockRecord {
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  amount: number;
  currency: string;
}

/**
 * Local/test payment provider. Approves every payment unless the customer
 * email starts with "fail-" (used by tests to simulate a declined payment),
 * so integration tests and local dev never need a real gateway account.
 *
 * The important part is not *this* class but the fact that booking
 * confirmation always goes through PaymentProvider.verifyPayment() on the
 * server rather than trusting a client-supplied "success" flag - swapping
 * in StripePaymentProvider/RazorpayPaymentProvider later requires no
 * changes to booking.service.ts.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  private readonly store = new Map<string, MockRecord>();

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const providerPaymentId = `mock_pay_${randomUUID()}`;
    const shouldFail = input.customerEmail.toLowerCase().startsWith('fail-');
    const status = shouldFail ? 'FAILED' : 'SUCCESS';

    this.store.set(providerPaymentId, {
      status,
      amount: input.amount,
      currency: input.currency,
    });

    return {
      providerPaymentId,
      clientSecret: providerPaymentId,
      status,
      raw: { mock: true, bookingId: input.bookingId },
    };
  }

  async verifyPayment({ providerPaymentId }: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const record = this.store.get(providerPaymentId);
    if (!record) {
      return { providerPaymentId, status: 'FAILED' };
    }
    return {
      providerPaymentId,
      status: record.status === 'REFUNDED' ? 'SUCCESS' : record.status,
      amount: record.amount,
      currency: record.currency,
    };
  }

  async refundPayment({ providerPaymentId, amount }: RefundPaymentInput): Promise<RefundPaymentResult> {
    const record = this.store.get(providerPaymentId);
    if (!record || record.status !== 'SUCCESS') {
      return { refundId: `mock_refund_${randomUUID()}`, status: 'FAILED', amount };
    }
    record.status = 'REFUNDED';
    return { refundId: `mock_refund_${randomUUID()}`, status: 'SUCCESS', amount };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult> {
    const record = this.store.get(providerPaymentId);
    if (!record) {
      return { providerPaymentId, status: 'FAILED' };
    }
    return { providerPaymentId, status: record.status };
  }
}
