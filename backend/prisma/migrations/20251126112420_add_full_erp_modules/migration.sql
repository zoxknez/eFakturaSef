-- CreateEnum
CREATE TYPE "PPPDVPeriodType" AS ENUM ('MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "PPPDVStatus" AS ENUM ('DRAFT', 'CALCULATED', 'SUBMITTED', 'CORRECTED');

-- CreateEnum
CREATE TYPE "CompensationStatus" AS ENUM ('DRAFT', 'PENDING', 'SIGNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CompensationItemType" AS ENUM ('RECEIVABLE', 'PAYABLE');

-- CreateEnum
CREATE TYPE "IOSStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "AdvanceInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_USED', 'FULLY_USED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmailTemplateType" AS ENUM ('INVOICE_SENT', 'PAYMENT_REMINDER', 'PAYMENT_OVERDUE', 'IOS_REQUEST', 'COMPENSATION', 'WELCOME', 'CUSTOM');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED');

-- CreateTable
CREATE TABLE "pppdv_reports" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "period_type" "PPPDVPeriodType" NOT NULL DEFAULT 'MONTHLY',
    "field001" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "field002" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "field003" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "field004" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "field005" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "field006" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "field101" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "field102" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "field103" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "field104" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "field105" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "field106" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "field201" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "field202" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "field203" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "field204" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "PPPDVStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pppdv_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpo_entries" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "ordinal_number" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "document_number" TEXT,
    "document_type" TEXT,
    "gross_income" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_income" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "expense" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "invoice_id" TEXT,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpo_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compensations" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "partner_id" TEXT NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "status" "CompensationStatus" NOT NULL DEFAULT 'DRAFT',
    "signed_at" TIMESTAMP(3),
    "note" TEXT,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compensations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compensation_items" (
    "id" TEXT NOT NULL,
    "compensation_id" TEXT NOT NULL,
    "type" "CompensationItemType" NOT NULL,
    "invoice_id" TEXT,
    "document_number" TEXT NOT NULL,
    "document_date" TIMESTAMP(3) NOT NULL,
    "original_amount" DECIMAL(15,2) NOT NULL,
    "compensated_amount" DECIMAL(15,2) NOT NULL,
    "remaining_amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "compensation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ios_reports" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "as_of_date" TIMESTAMP(3) NOT NULL,
    "total_receivable" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_payable" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "IOSStatus" NOT NULL DEFAULT 'DRAFT',
    "sent_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "partner_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "partner_notes" TEXT,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ios_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ios_items" (
    "id" TEXT NOT NULL,
    "ios_report_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_number" TEXT NOT NULL,
    "document_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "debit_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "invoice_id" TEXT,

    CONSTRAINT "ios_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "currency_code" VARCHAR(3) NOT NULL,
    "currency_name" TEXT NOT NULL,
    "country" TEXT,
    "unit" INTEGER NOT NULL DEFAULT 1,
    "buying_rate" DECIMAL(15,6) NOT NULL,
    "middle_rate" DECIMAL(15,6) NOT NULL,
    "selling_rate" DECIMAL(15,6) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'NBS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advance_invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "partner_id" TEXT NOT NULL,
    "advance_amount" DECIMAL(15,2) NOT NULL,
    "tax_amount" DECIMAL(15,2) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RSD',
    "used_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remaining_amount" DECIMAL(15,2) NOT NULL,
    "closed_by_invoices" JSONB,
    "status" "AdvanceInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "sef_id" TEXT,
    "sef_status" TEXT,
    "sent_at" TIMESTAMP(3),
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advance_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EmailTemplateType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "variables" JSONB,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "to_name" TEXT,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "template_id" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3),
    "error_message" TEXT,
    "opened_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_flow_forecasts" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "expected_inflow" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "actual_inflow" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "expected_outflow" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "actual_outflow" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "expected_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "actual_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_flow_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pppdv_reports_company_id_idx" ON "pppdv_reports"("company_id");

-- CreateIndex
CREATE INDEX "pppdv_reports_year_month_idx" ON "pppdv_reports"("year", "month");

-- CreateIndex
CREATE INDEX "pppdv_reports_status_idx" ON "pppdv_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pppdv_reports_company_id_year_month_key" ON "pppdv_reports"("company_id", "year", "month");

-- CreateIndex
CREATE INDEX "kpo_entries_company_id_idx" ON "kpo_entries"("company_id");

-- CreateIndex
CREATE INDEX "kpo_entries_date_idx" ON "kpo_entries"("date");

-- CreateIndex
CREATE INDEX "kpo_entries_company_id_date_idx" ON "kpo_entries"("company_id", "date");

-- CreateIndex
CREATE INDEX "compensations_company_id_idx" ON "compensations"("company_id");

-- CreateIndex
CREATE INDEX "compensations_partner_id_idx" ON "compensations"("partner_id");

-- CreateIndex
CREATE INDEX "compensations_date_idx" ON "compensations"("date");

-- CreateIndex
CREATE INDEX "compensations_status_idx" ON "compensations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "compensations_company_id_number_key" ON "compensations"("company_id", "number");

-- CreateIndex
CREATE INDEX "compensation_items_compensation_id_idx" ON "compensation_items"("compensation_id");

-- CreateIndex
CREATE INDEX "compensation_items_invoice_id_idx" ON "compensation_items"("invoice_id");

-- CreateIndex
CREATE INDEX "ios_reports_company_id_idx" ON "ios_reports"("company_id");

-- CreateIndex
CREATE INDEX "ios_reports_partner_id_idx" ON "ios_reports"("partner_id");

-- CreateIndex
CREATE INDEX "ios_reports_as_of_date_idx" ON "ios_reports"("as_of_date");

-- CreateIndex
CREATE UNIQUE INDEX "ios_reports_company_id_number_key" ON "ios_reports"("company_id", "number");

-- CreateIndex
CREATE INDEX "ios_items_ios_report_id_idx" ON "ios_items"("ios_report_id");

-- CreateIndex
CREATE INDEX "exchange_rates_date_idx" ON "exchange_rates"("date");

-- CreateIndex
CREATE INDEX "exchange_rates_currency_code_idx" ON "exchange_rates"("currency_code");

-- CreateIndex
CREATE INDEX "exchange_rates_date_currency_code_idx" ON "exchange_rates"("date", "currency_code");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_date_currency_code_key" ON "exchange_rates"("date", "currency_code");

-- CreateIndex
CREATE UNIQUE INDEX "advance_invoices_sef_id_key" ON "advance_invoices"("sef_id");

-- CreateIndex
CREATE INDEX "advance_invoices_company_id_idx" ON "advance_invoices"("company_id");

-- CreateIndex
CREATE INDEX "advance_invoices_partner_id_idx" ON "advance_invoices"("partner_id");

-- CreateIndex
CREATE INDEX "advance_invoices_status_idx" ON "advance_invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "advance_invoices_company_id_invoice_number_key" ON "advance_invoices"("company_id", "invoice_number");

-- CreateIndex
CREATE INDEX "email_templates_company_id_idx" ON "email_templates"("company_id");

-- CreateIndex
CREATE INDEX "email_templates_type_idx" ON "email_templates"("type");

-- CreateIndex
CREATE INDEX "email_logs_company_id_idx" ON "email_logs"("company_id");

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_reference_type_reference_id_idx" ON "email_logs"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "cash_flow_forecasts_company_id_idx" ON "cash_flow_forecasts"("company_id");

-- CreateIndex
CREATE INDEX "cash_flow_forecasts_date_idx" ON "cash_flow_forecasts"("date");

-- CreateIndex
CREATE UNIQUE INDEX "cash_flow_forecasts_company_id_date_key" ON "cash_flow_forecasts"("company_id", "date");

-- AddForeignKey
ALTER TABLE "pppdv_reports" ADD CONSTRAINT "pppdv_reports_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpo_entries" ADD CONSTRAINT "kpo_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensations" ADD CONSTRAINT "compensations_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensations" ADD CONSTRAINT "compensations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_items" ADD CONSTRAINT "compensation_items_compensation_id_fkey" FOREIGN KEY ("compensation_id") REFERENCES "compensations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ios_reports" ADD CONSTRAINT "ios_reports_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ios_reports" ADD CONSTRAINT "ios_reports_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ios_items" ADD CONSTRAINT "ios_items_ios_report_id_fkey" FOREIGN KEY ("ios_report_id") REFERENCES "ios_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_invoices" ADD CONSTRAINT "advance_invoices_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_invoices" ADD CONSTRAINT "advance_invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flow_forecasts" ADD CONSTRAINT "cash_flow_forecasts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
