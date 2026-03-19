-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUND_PENDING';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "refund_amount" DECIMAL(10,2),
ADD COLUMN     "refund_reason" TEXT,
ADD COLUMN     "refund_ref" TEXT,
ADD COLUMN     "refunded_at" TIMESTAMP(3);
