-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('INITIAL', 'PURCHASE', 'SALE', 'RETURN_IN', 'RETURN_OUT', 'ADJUSTMENT', 'DAMAGE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "CalculationStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FixedAssetStatus" AS ENUM ('ACTIVE', 'WRITTEN_OFF', 'SOLD');

-- CreateEnum
CREATE TYPE "PettyCashType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "TravelOrderStatus" AS ENUM ('DRAFT', 'APPROVED', 'COMPLETED', 'PAID');

-- CreateEnum
CREATE TYPE "SefVatType" AS ENUM ('INDIVIDUAL', 'SUMMARY');

-- AlterTable
ALTER TABLE "incoming_invoice_lines" ADD COLUMN     "product_id" TEXT;

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "type" "InventoryTransactionType" NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "stock_before" DECIMAL(15,3) NOT NULL,
    "stock_after" DECIMAL(15,3) NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "note" TEXT,
    "company_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculations" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "incoming_invoice_id" TEXT,
    "partner_id" TEXT,
    "warehouse" TEXT DEFAULT 'Centralni magacin',
    "total_wholesale" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_expenses" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_margin" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_retail" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "CalculationStatus" NOT NULL DEFAULT 'DRAFT',
    "posted_at" TIMESTAMP(3),
    "company_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_items" (
    "id" TEXT NOT NULL,
    "calculation_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "supplier_price" DECIMAL(15,2) NOT NULL,
    "expense_per_unit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "cost_price" DECIMAL(15,2) NOT NULL,
    "margin_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "margin_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sales_price_no_vat" DECIMAL(15,2) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL,
    "sales_price" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "calculation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" TEXT NOT NULL,
    "inventory_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purchase_date" TIMESTAMP(3) NOT NULL,
    "purchase_value" DECIMAL(15,2) NOT NULL,
    "supplier_id" TEXT,
    "invoice_number" TEXT,
    "amortization_rate" DECIMAL(5,2) NOT NULL,
    "current_value" DECIMAL(15,2) NOT NULL,
    "accumulated_amortization" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "FixedAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "location" TEXT,
    "employee" TEXT,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Glavna blagajna',
    "currency" TEXT NOT NULL DEFAULT 'RSD',
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "company_id" TEXT NOT NULL,

    CONSTRAINT "petty_cash_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_entries" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "entry_number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "PettyCashType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "description" TEXT NOT NULL,
    "partner_id" TEXT,
    "partner_name" TEXT,
    "expense_category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "petty_cash_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "vehicle" TEXT,
    "destination" TEXT NOT NULL,
    "departure_date" TIMESTAMP(3) NOT NULL,
    "return_date" TIMESTAMP(3),
    "advance_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_expenses" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "per_diem_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "TravelOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sef_vat_evidence" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "type" "SefVatType" NOT NULL,
    "tax_period" TEXT NOT NULL,
    "document_number" TEXT,
    "issue_date" TIMESTAMP(3),
    "tax_base" DECIMAL(15,2) NOT NULL,
    "tax_amount" DECIMAL(15,2) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "sef_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sef_vat_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_bom" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_bom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_transactions_company_id_idx" ON "inventory_transactions"("company_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_product_id_idx" ON "inventory_transactions"("product_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_type_idx" ON "inventory_transactions"("type");

-- CreateIndex
CREATE INDEX "inventory_transactions_created_at_idx" ON "inventory_transactions"("created_at");

-- CreateIndex
CREATE INDEX "inventory_transactions_reference_type_reference_id_idx" ON "inventory_transactions"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "calculations_company_id_idx" ON "calculations"("company_id");

-- CreateIndex
CREATE INDEX "calculations_date_idx" ON "calculations"("date");

-- CreateIndex
CREATE INDEX "calculations_status_idx" ON "calculations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "calculations_company_id_number_key" ON "calculations"("company_id", "number");

-- CreateIndex
CREATE INDEX "calculation_items_calculation_id_idx" ON "calculation_items"("calculation_id");

-- CreateIndex
CREATE INDEX "calculation_items_product_id_idx" ON "calculation_items"("product_id");

-- CreateIndex
CREATE INDEX "fixed_assets_company_id_idx" ON "fixed_assets"("company_id");

-- CreateIndex
CREATE INDEX "fixed_assets_status_idx" ON "fixed_assets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_company_id_inventory_number_key" ON "fixed_assets"("company_id", "inventory_number");

-- CreateIndex
CREATE INDEX "petty_cash_accounts_company_id_idx" ON "petty_cash_accounts"("company_id");

-- CreateIndex
CREATE INDEX "petty_cash_entries_account_id_idx" ON "petty_cash_entries"("account_id");

-- CreateIndex
CREATE INDEX "petty_cash_entries_date_idx" ON "petty_cash_entries"("date");

-- CreateIndex
CREATE INDEX "petty_cash_entries_type_idx" ON "petty_cash_entries"("type");

-- CreateIndex
CREATE INDEX "travel_orders_company_id_idx" ON "travel_orders"("company_id");

-- CreateIndex
CREATE INDEX "travel_orders_status_idx" ON "travel_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "travel_orders_company_id_order_number_key" ON "travel_orders"("company_id", "order_number");

-- CreateIndex
CREATE INDEX "sef_vat_evidence_company_id_idx" ON "sef_vat_evidence"("company_id");

-- CreateIndex
CREATE INDEX "sef_vat_evidence_period_idx" ON "sef_vat_evidence"("period");

-- CreateIndex
CREATE INDEX "sef_vat_evidence_status_idx" ON "sef_vat_evidence"("status");

-- CreateIndex
CREATE INDEX "product_bom_product_id_idx" ON "product_bom"("product_id");

-- CreateIndex
CREATE INDEX "product_bom_component_id_idx" ON "product_bom"("component_id");

-- CreateIndex
CREATE INDEX "incoming_invoice_lines_product_id_idx" ON "incoming_invoice_lines"("product_id");

-- AddForeignKey
ALTER TABLE "incoming_invoice_lines" ADD CONSTRAINT "incoming_invoice_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_incoming_invoice_id_fkey" FOREIGN KEY ("incoming_invoice_id") REFERENCES "incoming_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_items" ADD CONSTRAINT "calculation_items_calculation_id_fkey" FOREIGN KEY ("calculation_id") REFERENCES "calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_items" ADD CONSTRAINT "calculation_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_accounts" ADD CONSTRAINT "petty_cash_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_entries" ADD CONSTRAINT "petty_cash_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "petty_cash_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_orders" ADD CONSTRAINT "travel_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sef_vat_evidence" ADD CONSTRAINT "sef_vat_evidence_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bom" ADD CONSTRAINT "product_bom_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bom" ADD CONSTRAINT "product_bom_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
