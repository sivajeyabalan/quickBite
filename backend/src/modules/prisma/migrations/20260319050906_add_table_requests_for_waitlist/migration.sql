-- CreateEnum
CREATE TYPE "TableRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "table_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "TableRequestStatus" NOT NULL DEFAULT 'PENDING',
    "party_size" INTEGER,
    "notes" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "table_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "table_requests_status_idx" ON "table_requests"("status");

-- CreateIndex
CREATE INDEX "table_requests_user_id_status_idx" ON "table_requests"("user_id", "status");

-- AddForeignKey
ALTER TABLE "table_requests" ADD CONSTRAINT "table_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
