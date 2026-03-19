-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "accept_by" TIMESTAMP(3),
ADD COLUMN     "accepted_at" TIMESTAMP(3),
ADD COLUMN     "cancel_reason" TEXT;
