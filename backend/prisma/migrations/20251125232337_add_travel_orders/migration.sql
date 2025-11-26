/*
  Warnings:

  - The values [COMPLETED] on the enum `TravelOrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `per_diem_amount` on the `travel_orders` table. All the data in the column will be lost.
  - Made the column `return_date` on table `travel_orders` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TravelOrderStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');
ALTER TABLE "public"."travel_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "travel_orders" ALTER COLUMN "status" TYPE "TravelOrderStatus_new" USING ("status"::text::"TravelOrderStatus_new");
ALTER TYPE "TravelOrderStatus" RENAME TO "TravelOrderStatus_old";
ALTER TYPE "TravelOrderStatus_new" RENAME TO "TravelOrderStatus";
DROP TYPE "public"."TravelOrderStatus_old";
ALTER TABLE "travel_orders" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "travel_orders" DROP COLUMN "per_diem_amount",
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'RS',
ADD COLUMN     "employee_id" TEXT,
ADD COLUMN     "total_payout" DECIMAL(15,2) NOT NULL DEFAULT 0,
ALTER COLUMN "return_date" SET NOT NULL;

-- CreateTable
CREATE TABLE "travel_order_expenses" (
    "id" TEXT NOT NULL,
    "travel_order_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RSD',
    "description" TEXT,
    "attachment_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_order_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "travel_order_expenses_travel_order_id_idx" ON "travel_order_expenses"("travel_order_id");

-- AddForeignKey
ALTER TABLE "travel_order_expenses" ADD CONSTRAINT "travel_order_expenses_travel_order_id_fkey" FOREIGN KEY ("travel_order_id") REFERENCES "travel_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
