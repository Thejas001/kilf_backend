import { env } from '../../config/env';
import { PaymentProvider } from './PaymentProvider';
import { MockPaymentProvider } from './MockPaymentProvider';
import { RazorpayPaymentProvider } from './RazorpayPaymentProvider';

/**
 * Factory for the active payment provider. To add Stripe:
 *   1. Implement PaymentProvider in StripePaymentProvider.ts
 *   2. Add a case below keyed by env.PAYMENT_PROVIDER
 * No other file in the codebase needs to change - booking/refund/revenue
 * logic depends only on the PaymentProvider interface.
 */
function createPaymentProvider(): PaymentProvider {
  switch (env.PAYMENT_PROVIDER) {
    case 'razorpay':
      return new RazorpayPaymentProvider();
    case 'mock':
    default:
      return new MockPaymentProvider();
  }
}

export const paymentProvider: PaymentProvider = createPaymentProvider();
export * from './PaymentProvider';
