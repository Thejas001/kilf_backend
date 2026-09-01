import Razorpay from 'razorpay';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
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

/** Razorpay represents money as the smallest currency subunit (paise for INR). */
function toSubunits(amount: number): number {
  return Math.round(amount * 100);
}
function fromSubunits(amount: number | string): number {
  return Number(amount) / 100;
}

/**
 * Real Razorpay integration. Orders API is used to create a payment intent
 * (`createPayment`); confirmation is always re-derived from Razorpay's own
 * records via `orders.fetchPayments` (`verifyPayment`), never from anything
 * the client claims - this is what makes the "never trust the frontend"
 * booking rule hold for a real gateway, not just the mock provider.
 *
 * `providerPaymentId` throughout this class is the Razorpay **order id**
 * (`order_...`), not a payment id - an order can have multiple payment
 * attempts (e.g. one failed card, one successful UPI retry), so the order is
 * the stable identifier we store against our `Payment` row.
 */
export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = 'razorpay';
  private readonly client: Razorpay;

  constructor() {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error(
        'PAYMENT_PROVIDER=razorpay requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to be set'
      );
    }
    this.client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const order = await this.client.orders.create({
      amount: toSubunits(input.amount),
      currency: input.currency,
      receipt: input.bookingNumber,
      notes: { bookingId: input.bookingId, bookingNumber: input.bookingNumber },
    });

    return {
      providerPaymentId: String(order.id),
      // The frontend needs the publishable key id + order id to open
      // Razorpay Checkout; ApiError.raw is surfaced to the client via the
      // booking creation response (see booking.controller.ts).
      raw: {
        keyId: env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      status: 'PENDING',
    };
  }

  async verifyPayment({ providerPaymentId }: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const orderId = providerPaymentId;
    const { items } = await this.client.orders.fetchPayments(orderId);

    const captured = items.find((p) => p.status === 'captured');
    if (captured) {
      return {
        providerPaymentId: orderId,
        status: 'SUCCESS',
        amount: fromSubunits(captured.amount),
        currency: captured.currency,
        raw: captured,
      };
    }

    const allFailed = items.length > 0 && items.every((p) => p.status === 'failed');
    if (allFailed) {
      return { providerPaymentId: orderId, status: 'FAILED', raw: items };
    }

    // No payment attempt yet, or one is still 'created'/'authorized'.
    return { providerPaymentId: orderId, status: 'PENDING', raw: items };
  }

  async refundPayment({ providerPaymentId, amount }: RefundPaymentInput): Promise<RefundPaymentResult> {
    const orderId = providerPaymentId;

    try {
      const { items } = await this.client.orders.fetchPayments(orderId);
      const captured = items.find((p) => p.status === 'captured');
      if (!captured) {
        return { refundId: '', status: 'FAILED', amount };
      }

      const refund = await this.client.payments.refund(String(captured.id), {
        amount: toSubunits(amount),
      });

      return { refundId: String(refund.id), status: 'SUCCESS', amount, raw: refund };
    } catch (err) {
      logger.error({ err, orderId }, 'Razorpay refund failed');
      return { refundId: '', status: 'FAILED', amount };
    }
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult> {
    const orderId = providerPaymentId;
    const { items } = await this.client.orders.fetchPayments(orderId);

    const captured = items.find((p) => p.status === 'captured');
    if (captured) {
      return {
        providerPaymentId: orderId,
        status: captured.refund_status === 'full' ? 'REFUNDED' : 'SUCCESS',
      };
    }
    if (items.length > 0 && items.every((p) => p.status === 'failed')) {
      return { providerPaymentId: orderId, status: 'FAILED' };
    }
    return { providerPaymentId: orderId, status: 'PENDING' };
  }
}
