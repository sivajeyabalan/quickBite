/*
  Warnings:

  - You are about to drop the `table_assignments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `table_requests` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE IF EXISTS "table_assignments" DROP CONSTRAINT IF EXISTS "table_assignments_assigned_by_id_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "table_assignments" DROP CONSTRAINT IF EXISTS "table_assignments_user_id_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "table_requests" DROP CONSTRAINT IF EXISTS "table_requests_user_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "table_assignments";

-- DropTable
DROP TABLE IF EXISTS "table_requests";
