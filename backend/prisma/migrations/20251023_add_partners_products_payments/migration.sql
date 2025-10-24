-- CreateEnum (novi enumi)
CREATE TYPE "PartnerType" AS ENUM ('BUYER', 'SUPPLIER', 'BOTH');
CREATE TYPE "InvoicePaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'CHECK', 'COMPENSATION', 'OTHER');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED');

-- CreateTable: Partner šifarnik
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

-- CreateTable: Product šifarnik
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

-- CreateTable: Payment
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

-- AlterTable: Invoice (dodavanje novih kolona - BACKWARD COMPATIBLE)
ALTER TABLE "invoices" 
    ADD COLUMN "partner_id" TEXT,
    ADD COLUMN "payment_status" "InvoicePaymentStatus" NOT NULL DEFAULT 'UNPAID',
    ADD COLUMN "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- AlterTable: Invoice (postojeća polja -> nullable za backward compatibility)
ALTER TABLE "invoices" 
    ALTER COLUMN "buyer_name" DROP NOT NULL,
    ALTER COLUMN "buyer_pib" DROP NOT NULL;

-- AlterTable: InvoiceLine (dodavanje product link i dodatnih polja)
ALTER TABLE "invoice_lines"
    ADD COLUMN "product_id" TEXT,
    ADD COLUMN "item_description" TEXT,
    ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'kom',
    ADD COLUMN "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- CreateIndex: Partners
CREATE UNIQUE INDEX "unique_partner_pib_per_company" ON "partners"("company_id", "pib");
CREATE INDEX "partners_company_id_idx" ON "partners"("company_id");
CREATE INDEX "partners_type_idx" ON "partners"("type");
CREATE INDEX "partners_pib_idx" ON "partners"("pib");
CREATE INDEX "partners_is_active_idx" ON "partners"("is_active");
CREATE INDEX "partners_company_id_type_idx" ON "partners"("company_id", "type");
CREATE INDEX "partners_company_id_is_active_idx" ON "partners"("company_id", "is_active");

-- CreateIndex: Products
CREATE UNIQUE INDEX "unique_product_code_per_company" ON "products"("company_id", "code");
CREATE INDEX "products_company_id_idx" ON "products"("company_id");
CREATE INDEX "products_barcode_idx" ON "products"("barcode");
CREATE INDEX "products_is_active_idx" ON "products"("is_active");
CREATE INDEX "products_category_idx" ON "products"("category");
CREATE INDEX "products_company_id_is_active_idx" ON "products"("company_id", "is_active");
CREATE INDEX "products_company_id_category_idx" ON "products"("company_id", "category");

-- CreateIndex: Payments
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at");
CREATE INDEX "payments_invoice_id_status_idx" ON "payments"("invoice_id", "status");

-- CreateIndex: Invoice (novi indexi za nove kolone)
CREATE INDEX "invoices_partner_id_idx" ON "invoices"("partner_id");
CREATE INDEX "invoices_payment_status_idx" ON "invoices"("payment_status");
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");
CREATE INDEX "invoices_company_id_payment_status_idx" ON "invoices"("company_id", "payment_status");

-- CreateIndex: InvoiceLine
CREATE INDEX "invoice_lines_product_id_idx" ON "invoice_lines"("product_id");

-- AddForeignKey: Partners → Companies
ALTER TABLE "partners" ADD CONSTRAINT "partners_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Products → Companies
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Payments → Invoices
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" 
    FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Invoice → Partner (nullable - može biti legacy faktura bez partnera)
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_partner_id_fkey" 
    FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: InvoiceLine → Product (nullable - može biti legacy stavka bez proizvoda)
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_product_id_fkey" 
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- IMPORTANT NOTE:
-- Ova migracija je dizajnirana da bude BACKWARD COMPATIBLE sa postojećim podacima.
-- Legacy Invoice rekordi sa buyerName/buyerPIB će i dalje raditi.
-- Nova logika: ako postoji partnerId, koristi ga; ako ne, fallback na legacy polja.
