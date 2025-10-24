-- Add unique constraint for invoice number per company
-- This ensures that each company can only have one invoice with a specific number
ALTER TABLE "invoices" ADD CONSTRAINT "unique_invoice_number_per_company" UNIQUE ("company_id", "invoice_number");

-- Add check constraints for positive amounts
-- Ensures financial integrity of invoice data
ALTER TABLE "invoices" ADD CONSTRAINT "check_positive_total_amount" CHECK ("total_amount" >= 0);
ALTER TABLE "invoices" ADD CONSTRAINT "check_positive_tax_amount" CHECK ("tax_amount" >= 0);

-- Add check constraint for due date (must be after or equal to issue date)
ALTER TABLE "invoices" ADD CONSTRAINT "check_due_date_after_issue" CHECK ("due_date" IS NULL OR "due_date" >= "issue_date");

-- Add check constraint for line quantities (must be positive)
ALTER TABLE "invoice_lines" ADD CONSTRAINT "check_positive_quantity" CHECK ("quantity" > 0);

-- Add check constraints for line amounts (must be non-negative)
ALTER TABLE "invoice_lines" ADD CONSTRAINT "check_nonnegative_unit_price" CHECK ("unit_price" >= 0);
ALTER TABLE "invoice_lines" ADD CONSTRAINT "check_nonnegative_amount" CHECK ("amount" >= 0);

-- Add check constraint for tax rates (must be between 0 and 100)
ALTER TABLE "invoice_lines" ADD CONSTRAINT "check_tax_rate_range" CHECK ("tax_rate" >= 0 AND "tax_rate" <= 100);
