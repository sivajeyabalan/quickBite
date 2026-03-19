-- CreateEnum
CREATE TYPE "TableAssignmentStatus" AS ENUM ('ACTIVE', 'RELEASED');

-- CreateTable
CREATE TABLE "table_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "table_number" TEXT NOT NULL,
    "status" "TableAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "table_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "table_assignments_user_id_status_idx" ON "table_assignments"("user_id", "status");

-- CreateIndex
CREATE INDEX "table_assignments_table_number_status_idx" ON "table_assignments"("table_number", "status");

-- AddForeignKey
ALTER TABLE "table_assignments" ADD CONSTRAINT "table_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_assignments" ADD CONSTRAINT "table_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
