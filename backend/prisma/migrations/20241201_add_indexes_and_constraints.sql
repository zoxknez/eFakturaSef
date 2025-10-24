-- Add database indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_invoices_company_id" ON "invoices"("company_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_status" ON "invoices"("status");
CREATE INDEX IF NOT EXISTS "idx_invoices_issue_date" ON "invoices"("issue_date");
CREATE INDEX IF NOT EXISTS "idx_invoices_buyer_pib" ON "invoices"("buyer_pib");
CREATE INDEX IF NOT EXISTS "idx_invoices_created_at" ON "invoices"("created_at");
CREATE INDEX IF NOT EXISTS "idx_invoices_sef_id" ON "invoices"("sef_id") WHERE "sef_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_invoice_lines_invoice_id" ON "invoice_lines"("invoice_id");
CREATE INDEX IF NOT EXISTS "idx_invoice_lines_line_number" ON "invoice_lines"("line_number");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_id" ON "audit_logs"("entity_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_type" ON "audit_logs"("entity_type");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs"("user_id") WHERE "user_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_sef_webhook_logs_processed" ON "sef_webhook_logs"("processed");
CREATE INDEX IF NOT EXISTS "idx_sef_webhook_logs_created_at" ON "sef_webhook_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_sef_webhook_logs_event_type" ON "sef_webhook_logs"("event_type");

CREATE INDEX IF NOT EXISTS "idx_job_queue_status" ON "job_queue"("status");
CREATE INDEX IF NOT EXISTS "idx_job_queue_type" ON "job_queue"("type");
CREATE INDEX IF NOT EXISTS "idx_job_queue_created_at" ON "job_queue"("created_at");
CREATE INDEX IF NOT EXISTS "idx_job_queue_scheduled_at" ON "job_queue"("scheduled_at") WHERE "scheduled_at" IS NOT NULL;

-- Add check constraints for data integrity
ALTER TABLE "invoices" ADD CONSTRAINT "chk_total_amount" CHECK ("total_amount" >= 0);
ALTER TABLE "invoices" ADD CONSTRAINT "chk_tax_amount" CHECK ("tax_amount" >= 0);
ALTER TABLE "invoices" ADD CONSTRAINT "chk_issue_date_not_future" CHECK ("issue_date" <= CURRENT_TIMESTAMP);
ALTER TABLE "invoices" ADD CONSTRAINT "chk_due_date_after_issue" CHECK ("due_date" IS NULL OR "due_date" >= "issue_date");

ALTER TABLE "invoice_lines" ADD CONSTRAINT "chk_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "invoice_lines" ADD CONSTRAINT "chk_unit_price_non_negative" CHECK ("unit_price" >= 0);
ALTER TABLE "invoice_lines" ADD CONSTRAINT "chk_tax_rate_valid" CHECK ("tax_rate" >= 0 AND "tax_rate" <= 100);
ALTER TABLE "invoice_lines" ADD CONSTRAINT "chk_amount_non_negative" CHECK ("amount" >= 0);

ALTER TABLE "companies" ADD CONSTRAINT "chk_pib_format" CHECK ("pib" ~ '^[0-9]{9}$');
ALTER TABLE "companies" ADD CONSTRAINT "chk_email_format" CHECK ("email" IS NULL OR "email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE "users" ADD CONSTRAINT "chk_email_format" CHECK ("email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
ALTER TABLE "users" ADD CONSTRAINT "chk_password_length" CHECK (LENGTH("password") >= 8);

-- Add soft delete columns
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- Add indexes for soft delete
CREATE INDEX IF NOT EXISTS "idx_invoices_deleted_at" ON "invoices"("deleted_at") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_companies_deleted_at" ON "companies"("deleted_at") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_users_deleted_at" ON "users"("deleted_at") WHERE "deleted_at" IS NULL;

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables that need updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_queue_updated_at BEFORE UPDATE ON job_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
