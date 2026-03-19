-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "available_from" TIMESTAMP(3),
ADD COLUMN     "available_to" TIMESTAMP(3),
ADD COLUMN     "is_86d" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stock_qty" INTEGER NOT NULL DEFAULT -1;
