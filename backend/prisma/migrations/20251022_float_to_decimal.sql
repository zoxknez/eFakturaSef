-- Migration: Float to Decimal for financial accuracy
-- Date: 2025-10-22
-- Description: Convert all Float columns to Decimal to prevent floating-point precision issues

-- Invoice table: totalAmount and taxAmount
ALTER TABLE "invoices" 
  ALTER COLUMN "total_amount" TYPE DECIMAL(15, 2),
  ALTER COLUMN "tax_amount" TYPE DECIMAL(15, 2);

-- InvoiceLine table: quantity, unitPrice, taxRate, amount
ALTER TABLE "invoice_lines"
  ALTER COLUMN "quantity" TYPE DECIMAL(10, 3),
  ALTER COLUMN "unit_price" TYPE DECIMAL(15, 2),
  ALTER COLUMN "tax_rate" TYPE DECIMAL(5, 2),
  ALTER COLUMN "amount" TYPE DECIMAL(15, 2);

