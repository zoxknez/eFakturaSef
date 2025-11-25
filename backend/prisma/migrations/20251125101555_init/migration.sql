-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('BUYER', 'SUPPLIER', 'BOTH');

-- CreateEnum
CREATE TYPE "InvoicePaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'CHECK', 'COMPENSATION', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ACCOUNTANT', 'AUDITOR', 'OPERATOR');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'DELIVERED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'STORNO', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('OUTGOING', 'INCOMING');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COST', 'OFF_BALANCE');

-- CreateEnum
CREATE TYPE "AccountSide" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "FiscalYearStatus" AS ENUM ('OPEN', 'LOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "JournalType" AS ENUM ('MANUAL', 'INVOICE', 'PAYMENT', 'BANK_STATEMENT', 'CLOSING', 'OPENING', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "VATRecordType" AS ENUM ('OUTPUT', 'INPUT');

-- CreateEnum
CREATE TYPE "BankStatementStatus" AS ENUM ('IMPORTED', 'PROCESSING', 'MATCHED', 'POSTED');

-- CreateEnum
CREATE TYPE "BankTransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'PARTIAL', 'IGNORED');

-- CreateEnum
CREATE TYPE "CreditNoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IncomingInvoiceStatus" AS ENUM ('RECEIVED', 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "pib" VARCHAR(9) NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'RS',
    "email" TEXT,
    "phone" TEXT,
    "bank_account" TEXT,
    "vat_number" TEXT,
    "sef_api_key" TEXT,
    "sef_environment" TEXT,
    "auto_stock_deduction" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL,
    "pib" VARCHAR(9) NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'RS',
    "email" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "website" TEXT,
    "contact_person" TEXT,
    "vat_payer" BOOLEAN NOT NULL DEFAULT true,
    "vat_number" TEXT,
    "default_payment_terms" INTEGER NOT NULL DEFAULT 15,
    "credit_limit" DECIMAL(15,2),
    "discount" DECIMAL(5,2) DEFAULT 0,
    "bank_accounts" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "subcategory" TEXT,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "cost_price" DECIMAL(15,2),
    "currency" TEXT NOT NULL DEFAULT 'RSD',
    "vat_rate" DECIMAL(5,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kom',
    "track_inventory" BOOLEAN NOT NULL DEFAULT false,
    "current_stock" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "min_stock" DECIMAL(15,3),
    "max_stock" DECIMAL(15,3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "supplier" TEXT,
    "manufacturer" TEXT,
    "note" TEXT,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "user_agent" TEXT,
    "ip_address" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "sef_id" TEXT,
    "sef_status" TEXT,
    "invoice_number" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "InvoiceType" NOT NULL DEFAULT 'OUTGOING',
    "partner_id" TEXT,
    "buyer_name" TEXT,
    "buyer_pib" TEXT,
    "buyer_address" TEXT,
    "buyer_city" TEXT,
    "buyer_postal_code" TEXT,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "tax_amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'RSD',
    "payment_status" "InvoicePaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ubl_xml" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "note" TEXT,
    "company_id" TEXT NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "product_id" TEXT,
    "item_name" TEXT NOT NULL,
    "item_description" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kom',
    "unit_price" DECIMAL(15,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "tax_amount" DECIMAL(15,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "user_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sef_webhook_logs" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "sef_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sef_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_queue" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "job_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RSD',
    "payment_date" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "bank_account" TEXT,
    "reference" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "description" TEXT,
    "level" INTEGER NOT NULL,
    "parent_id" TEXT,
    "type" "AccountType" NOT NULL,
    "normal_side" "AccountSide" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_years" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "FiscalYearStatus" NOT NULL DEFAULT 'OPEN',
    "closed_at" TIMESTAMP(3),
    "closed_by" TEXT,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "entry_number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "type" "JournalType" NOT NULL DEFAULT 'MANUAL',
    "reference_type" TEXT,
    "reference_id" TEXT,
    "fiscal_year_id" TEXT NOT NULL,
    "status" "JournalStatus" NOT NULL DEFAULT 'DRAFT',
    "posted_at" TIMESTAMP(3),
    "posted_by" TEXT,
    "total_debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "company_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "account_id" TEXT NOT NULL,
    "debit_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "partner_id" TEXT,
    "journal_entry_id" TEXT NOT NULL,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vat_records" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "type" "VATRecordType" NOT NULL,
    "document_number" TEXT NOT NULL,
    "document_date" TIMESTAMP(3) NOT NULL,
    "partner_name" TEXT NOT NULL,
    "partner_pib" TEXT NOT NULL,
    "tax_base_20" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "vat_amount_20" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_base_10" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "vat_amount_10" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "exempt_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "invoice_id" TEXT,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vat_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statements" (
    "id" TEXT NOT NULL,
    "statement_number" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "bank_name" TEXT,
    "statement_date" TIMESTAMP(3) NOT NULL,
    "from_date" TIMESTAMP(3) NOT NULL,
    "to_date" TIMESTAMP(3) NOT NULL,
    "opening_balance" DECIMAL(15,2) NOT NULL,
    "closing_balance" DECIMAL(15,2) NOT NULL,
    "total_debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "BankStatementStatus" NOT NULL DEFAULT 'IMPORTED',
    "processed_at" TIMESTAMP(3),
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "value_date" TIMESTAMP(3),
    "amount" DECIMAL(15,2) NOT NULL,
    "type" "BankTransactionType" NOT NULL,
    "partner_name" TEXT,
    "partner_account" TEXT,
    "reference" TEXT,
    "description" TEXT,
    "match_status" "MatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matched_invoice_id" TEXT,
    "matched_payment_id" TEXT,
    "statement_id" TEXT NOT NULL,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" TEXT NOT NULL,
    "credit_note_number" TEXT NOT NULL,
    "original_invoice_id" TEXT NOT NULL,
    "partner_id" TEXT,
    "partner_name" TEXT NOT NULL,
    "partner_pib" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "tax_amount" DECIMAL(15,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "sef_id" TEXT,
    "sef_status" TEXT,
    "sent_at" TIMESTAMP(3),
    "status" "CreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_note_lines" (
    "id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "item_name" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "tax_amount" DECIMAL(15,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "credit_note_id" TEXT NOT NULL,

    CONSTRAINT "credit_note_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incoming_invoices" (
    "id" TEXT NOT NULL,
    "sef_id" TEXT,
    "sef_status" TEXT,
    "invoice_number" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "received_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplier_name" TEXT NOT NULL,
    "supplier_pib" TEXT NOT NULL,
    "supplier_address" TEXT,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "tax_amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RSD',
    "status" "IncomingInvoiceStatus" NOT NULL DEFAULT 'RECEIVED',
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "payment_status" "InvoicePaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "company_id" TEXT NOT NULL,
    "partner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incoming_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incoming_invoice_lines" (
    "id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "item_name" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "tax_amount" DECIMAL(15,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "incoming_invoice_id" TEXT NOT NULL,

    CONSTRAINT "incoming_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB DEFAULT '{}',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_pib_key" ON "companies"("pib");

-- CreateIndex
CREATE INDEX "partners_company_id_idx" ON "partners"("company_id");

-- CreateIndex
CREATE INDEX "partners_type_idx" ON "partners"("type");

-- CreateIndex
CREATE INDEX "partners_pib_idx" ON "partners"("pib");

-- CreateIndex
CREATE INDEX "partners_is_active_idx" ON "partners"("is_active");

-- CreateIndex
CREATE INDEX "partners_name_idx" ON "partners"("name");

-- CreateIndex
CREATE INDEX "partners_company_id_type_is_active_idx" ON "partners"("company_id", "type", "is_active");

-- CreateIndex
CREATE INDEX "partners_company_id_is_active_name_idx" ON "partners"("company_id", "is_active", "name");

-- CreateIndex
CREATE INDEX "partners_company_id_type_idx" ON "partners"("company_id", "type");

-- CreateIndex
CREATE INDEX "partners_company_id_created_at_idx" ON "partners"("company_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "partners_company_id_pib_key" ON "partners"("company_id", "pib");

-- CreateIndex
CREATE INDEX "products_company_id_idx" ON "products"("company_id");

-- CreateIndex
CREATE INDEX "products_barcode_idx" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_code_idx" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_company_id_is_active_name_idx" ON "products"("company_id", "is_active", "name");

-- CreateIndex
CREATE INDEX "products_company_id_category_is_active_idx" ON "products"("company_id", "category", "is_active");

-- CreateIndex
CREATE INDEX "products_company_id_track_inventory_current_stock_idx" ON "products"("company_id", "track_inventory", "current_stock");

-- CreateIndex
CREATE INDEX "products_company_id_is_active_category_idx" ON "products"("company_id", "is_active", "category");

-- CreateIndex
CREATE INDEX "products_company_id_created_at_idx" ON "products"("company_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "products_company_id_code_key" ON "products"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_company_id_is_active_idx" ON "users"("company_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_revoked_idx" ON "refresh_tokens"("user_id", "revoked");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_sef_id_key" ON "invoices"("sef_id");

-- CreateIndex
CREATE INDEX "invoices_company_id_idx" ON "invoices"("company_id");

-- CreateIndex
CREATE INDEX "invoices_partner_id_idx" ON "invoices"("partner_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_payment_status_idx" ON "invoices"("payment_status");

-- CreateIndex
CREATE INDEX "invoices_issue_date_idx" ON "invoices"("issue_date");

-- CreateIndex
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");

-- CreateIndex
CREATE INDEX "invoices_sef_id_idx" ON "invoices"("sef_id");

-- CreateIndex
CREATE INDEX "invoices_invoice_number_idx" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_buyer_pib_idx" ON "invoices"("buyer_pib");

-- CreateIndex
CREATE INDEX "invoices_created_at_idx" ON "invoices"("created_at");

-- CreateIndex
CREATE INDEX "invoices_sent_at_idx" ON "invoices"("sent_at");

-- CreateIndex
CREATE INDEX "invoices_type_idx" ON "invoices"("type");

-- CreateIndex
CREATE INDEX "invoices_company_id_status_issue_date_idx" ON "invoices"("company_id", "status", "issue_date" DESC);

-- CreateIndex
CREATE INDEX "invoices_company_id_payment_status_due_date_idx" ON "invoices"("company_id", "payment_status", "due_date");

-- CreateIndex
CREATE INDEX "invoices_company_id_type_status_idx" ON "invoices"("company_id", "type", "status");

-- CreateIndex
CREATE INDEX "invoices_company_id_issue_date_status_idx" ON "invoices"("company_id", "issue_date" DESC, "status");

-- CreateIndex
CREATE INDEX "idx_overdue_invoices" ON "invoices"("company_id", "payment_status", "due_date");

-- CreateIndex
CREATE INDEX "invoices_partner_id_issue_date_idx" ON "invoices"("partner_id", "issue_date" DESC);

-- CreateIndex
CREATE INDEX "invoices_sef_id_status_idx" ON "invoices"("sef_id", "status");

-- CreateIndex
CREATE INDEX "invoices_company_id_sef_status_idx" ON "invoices"("company_id", "sef_status");

-- CreateIndex
CREATE INDEX "invoices_company_id_created_at_idx" ON "invoices"("company_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "invoices_company_id_sent_at_idx" ON "invoices"("company_id", "sent_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_company_id_invoice_number_key" ON "invoices"("company_id", "invoice_number");

-- CreateIndex
CREATE INDEX "invoice_lines_invoice_id_idx" ON "invoice_lines"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_lines_product_id_idx" ON "invoice_lines"("product_id");

-- CreateIndex
CREATE INDEX "invoice_lines_invoice_id_line_number_idx" ON "invoice_lines"("invoice_id", "line_number");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_created_at_idx" ON "audit_logs"("entity_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_action_created_at_idx" ON "audit_logs"("user_id", "action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_action_created_at_idx" ON "audit_logs"("entity_type", "action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "sef_webhook_logs_sef_id_idx" ON "sef_webhook_logs"("sef_id");

-- CreateIndex
CREATE INDEX "sef_webhook_logs_processed_idx" ON "sef_webhook_logs"("processed");

-- CreateIndex
CREATE INDEX "sef_webhook_logs_event_type_idx" ON "sef_webhook_logs"("event_type");

-- CreateIndex
CREATE INDEX "sef_webhook_logs_created_at_idx" ON "sef_webhook_logs"("created_at");

-- CreateIndex
CREATE INDEX "sef_webhook_logs_sef_id_processed_idx" ON "sef_webhook_logs"("sef_id", "processed");

-- CreateIndex
CREATE INDEX "sef_webhook_logs_processed_created_at_idx" ON "sef_webhook_logs"("processed", "created_at");

-- CreateIndex
CREATE INDEX "job_queue_status_idx" ON "job_queue"("status");

-- CreateIndex
CREATE INDEX "job_queue_type_idx" ON "job_queue"("type");

-- CreateIndex
CREATE INDEX "job_queue_scheduled_at_idx" ON "job_queue"("scheduled_at");

-- CreateIndex
CREATE INDEX "job_queue_created_at_idx" ON "job_queue"("created_at");

-- CreateIndex
CREATE INDEX "job_queue_status_scheduled_at_idx" ON "job_queue"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "job_queue_type_status_idx" ON "job_queue"("type", "status");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at");

-- CreateIndex
CREATE INDEX "payments_method_idx" ON "payments"("method");

-- CreateIndex
CREATE INDEX "payments_invoice_id_status_idx" ON "payments"("invoice_id", "status");

-- CreateIndex
CREATE INDEX "payments_invoice_id_payment_date_idx" ON "payments"("invoice_id", "payment_date" DESC);

-- CreateIndex
CREATE INDEX "payments_status_payment_date_idx" ON "payments"("status", "payment_date");

-- CreateIndex
CREATE INDEX "payments_created_at_status_idx" ON "payments"("created_at" DESC, "status");

-- CreateIndex
CREATE INDEX "accounts_company_id_idx" ON "accounts"("company_id");

-- CreateIndex
CREATE INDEX "accounts_parent_id_idx" ON "accounts"("parent_id");

-- CreateIndex
CREATE INDEX "accounts_type_idx" ON "accounts"("type");

-- CreateIndex
CREATE INDEX "accounts_level_idx" ON "accounts"("level");

-- CreateIndex
CREATE INDEX "accounts_is_active_idx" ON "accounts"("is_active");

-- CreateIndex
CREATE INDEX "accounts_company_id_level_code_idx" ON "accounts"("company_id", "level", "code");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_company_id_code_key" ON "accounts"("company_id", "code");

-- CreateIndex
CREATE INDEX "fiscal_years_company_id_idx" ON "fiscal_years"("company_id");

-- CreateIndex
CREATE INDEX "fiscal_years_status_idx" ON "fiscal_years"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_years_company_id_year_key" ON "fiscal_years"("company_id", "year");

-- CreateIndex
CREATE INDEX "journal_entries_company_id_idx" ON "journal_entries"("company_id");

-- CreateIndex
CREATE INDEX "journal_entries_fiscal_year_id_idx" ON "journal_entries"("fiscal_year_id");

-- CreateIndex
CREATE INDEX "journal_entries_date_idx" ON "journal_entries"("date");

-- CreateIndex
CREATE INDEX "journal_entries_status_idx" ON "journal_entries"("status");

-- CreateIndex
CREATE INDEX "journal_entries_type_idx" ON "journal_entries"("type");

-- CreateIndex
CREATE INDEX "journal_entries_reference_type_reference_id_idx" ON "journal_entries"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "journal_entries_company_id_date_idx" ON "journal_entries"("company_id", "date" DESC);

-- CreateIndex
CREATE INDEX "journal_entries_company_id_status_date_idx" ON "journal_entries"("company_id", "status", "date");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_company_id_entry_number_fiscal_year_id_key" ON "journal_entries"("company_id", "entry_number", "fiscal_year_id");

-- CreateIndex
CREATE INDEX "journal_lines_journal_entry_id_idx" ON "journal_lines"("journal_entry_id");

-- CreateIndex
CREATE INDEX "journal_lines_account_id_idx" ON "journal_lines"("account_id");

-- CreateIndex
CREATE INDEX "journal_lines_partner_id_idx" ON "journal_lines"("partner_id");

-- CreateIndex
CREATE INDEX "journal_lines_journal_entry_id_line_number_idx" ON "journal_lines"("journal_entry_id", "line_number");

-- CreateIndex
CREATE INDEX "vat_records_company_id_idx" ON "vat_records"("company_id");

-- CreateIndex
CREATE INDEX "vat_records_year_month_idx" ON "vat_records"("year", "month");

-- CreateIndex
CREATE INDEX "vat_records_type_idx" ON "vat_records"("type");

-- CreateIndex
CREATE INDEX "vat_records_invoice_id_idx" ON "vat_records"("invoice_id");

-- CreateIndex
CREATE INDEX "vat_records_company_id_year_month_type_idx" ON "vat_records"("company_id", "year", "month", "type");

-- CreateIndex
CREATE INDEX "bank_statements_company_id_idx" ON "bank_statements"("company_id");

-- CreateIndex
CREATE INDEX "bank_statements_statement_date_idx" ON "bank_statements"("statement_date");

-- CreateIndex
CREATE INDEX "bank_statements_status_idx" ON "bank_statements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bank_statements_company_id_account_number_statement_number_key" ON "bank_statements"("company_id", "account_number", "statement_number");

-- CreateIndex
CREATE INDEX "bank_transactions_statement_id_idx" ON "bank_transactions"("statement_id");

-- CreateIndex
CREATE INDEX "bank_transactions_transaction_date_idx" ON "bank_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "bank_transactions_match_status_idx" ON "bank_transactions"("match_status");

-- CreateIndex
CREATE INDEX "bank_transactions_matched_invoice_id_idx" ON "bank_transactions"("matched_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_sef_id_key" ON "credit_notes"("sef_id");

-- CreateIndex
CREATE INDEX "credit_notes_company_id_idx" ON "credit_notes"("company_id");

-- CreateIndex
CREATE INDEX "credit_notes_original_invoice_id_idx" ON "credit_notes"("original_invoice_id");

-- CreateIndex
CREATE INDEX "credit_notes_status_idx" ON "credit_notes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_company_id_credit_note_number_key" ON "credit_notes"("company_id", "credit_note_number");

-- CreateIndex
CREATE INDEX "credit_note_lines_credit_note_id_idx" ON "credit_note_lines"("credit_note_id");

-- CreateIndex
CREATE UNIQUE INDEX "incoming_invoices_sef_id_key" ON "incoming_invoices"("sef_id");

-- CreateIndex
CREATE INDEX "incoming_invoices_company_id_idx" ON "incoming_invoices"("company_id");

-- CreateIndex
CREATE INDEX "incoming_invoices_sef_id_idx" ON "incoming_invoices"("sef_id");

-- CreateIndex
CREATE INDEX "incoming_invoices_status_idx" ON "incoming_invoices"("status");

-- CreateIndex
CREATE INDEX "incoming_invoices_payment_status_idx" ON "incoming_invoices"("payment_status");

-- CreateIndex
CREATE INDEX "incoming_invoices_supplier_pib_idx" ON "incoming_invoices"("supplier_pib");

-- CreateIndex
CREATE INDEX "incoming_invoices_company_id_status_received_date_idx" ON "incoming_invoices"("company_id", "status", "received_date" DESC);

-- CreateIndex
CREATE INDEX "incoming_invoice_lines_incoming_invoice_id_idx" ON "incoming_invoice_lines"("incoming_invoice_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_records" ADD CONSTRAINT "vat_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "bank_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_lines" ADD CONSTRAINT "credit_note_lines_credit_note_id_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incoming_invoices" ADD CONSTRAINT "incoming_invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incoming_invoice_lines" ADD CONSTRAINT "incoming_invoice_lines_incoming_invoice_id_fkey" FOREIGN KEY ("incoming_invoice_id") REFERENCES "incoming_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
