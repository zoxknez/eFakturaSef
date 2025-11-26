-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RecurringInvoiceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "permissions" JSONB;

-- CreateTable
CREATE TABLE "recurring_invoices" (
    "id" TEXT NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3) NOT NULL,
    "last_run_at" TIMESTAMP(3),
    "status" "RecurringInvoiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "partner_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RSD',
    "items" JSONB NOT NULL,
    "note" TEXT,
    "company_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_invoices_company_id_idx" ON "recurring_invoices"("company_id");

-- CreateIndex
CREATE INDEX "recurring_invoices_status_idx" ON "recurring_invoices"("status");

-- CreateIndex
CREATE INDEX "recurring_invoices_next_run_at_idx" ON "recurring_invoices"("next_run_at");

-- AddForeignKey
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
