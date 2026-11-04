-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'PAYMENT_REVIEW';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "gateway_payment_id" TEXT,
ADD COLUMN "refund_id" TEXT,
ADD COLUMN "last_checked_at" TIMESTAMP(3);
