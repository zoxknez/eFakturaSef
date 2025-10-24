-- Migration: Add performance indexes
-- Date: 2025-10-22
-- Description: Add indexes for frequently queried fields and compound indexes for common query patterns

-- User indexes
CREATE INDEX IF NOT EXISTS "users_company_id_idx" ON "users"("company_id");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_is_active_idx" ON "users"("is_active");
CREATE INDEX IF NOT EXISTS "users_company_id_is_active_idx" ON "users"("company_id", "is_active");

-- Invoice indexes
CREATE INDEX IF NOT EXISTS "invoices_company_id_idx" ON "invoices"("company_id");
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices"("status");
CREATE INDEX IF NOT EXISTS "invoices_issue_date_idx" ON "invoices"("issue_date");
CREATE INDEX IF NOT EXISTS "invoices_sef_id_idx" ON "invoices"("sef_id");
CREATE INDEX IF NOT EXISTS "invoices_invoice_number_idx" ON "invoices"("invoice_number");
CREATE INDEX IF NOT EXISTS "invoices_company_id_status_idx" ON "invoices"("company_id", "status");
CREATE INDEX IF NOT EXISTS "invoices_company_id_issue_date_idx" ON "invoices"("company_id", "issue_date");
CREATE INDEX IF NOT EXISTS "invoices_company_id_status_issue_date_idx" ON "invoices"("company_id", "status", "issue_date");
CREATE INDEX IF NOT EXISTS "invoices_buyer_pib_idx" ON "invoices"("buyer_pib");
CREATE INDEX IF NOT EXISTS "invoices_created_at_idx" ON "invoices"("created_at");
CREATE INDEX IF NOT EXISTS "invoices_sent_at_idx" ON "invoices"("sent_at");

-- InvoiceLine indexes
CREATE INDEX IF NOT EXISTS "invoice_lines_invoice_id_idx" ON "invoice_lines"("invoice_id");
CREATE INDEX IF NOT EXISTS "invoice_lines_invoice_id_line_number_idx" ON "invoice_lines"("invoice_id", "line_number");

-- AuditLog indexes
CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_created_at_idx" ON "audit_logs"("entity_type", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");

-- SEFWebhookLog indexes
CREATE INDEX IF NOT EXISTS "sef_webhook_logs_sef_id_idx" ON "sef_webhook_logs"("sef_id");
CREATE INDEX IF NOT EXISTS "sef_webhook_logs_processed_idx" ON "sef_webhook_logs"("processed");
CREATE INDEX IF NOT EXISTS "sef_webhook_logs_event_type_idx" ON "sef_webhook_logs"("event_type");
CREATE INDEX IF NOT EXISTS "sef_webhook_logs_created_at_idx" ON "sef_webhook_logs"("created_at");
CREATE INDEX IF NOT EXISTS "sef_webhook_logs_sef_id_processed_idx" ON "sef_webhook_logs"("sef_id", "processed");
CREATE INDEX IF NOT EXISTS "sef_webhook_logs_processed_created_at_idx" ON "sef_webhook_logs"("processed", "created_at");

-- JobQueue indexes
CREATE INDEX IF NOT EXISTS "job_queue_status_idx" ON "job_queue"("status");
CREATE INDEX IF NOT EXISTS "job_queue_type_idx" ON "job_queue"("type");
CREATE INDEX IF NOT EXISTS "job_queue_scheduled_at_idx" ON "job_queue"("scheduled_at");
CREATE INDEX IF NOT EXISTS "job_queue_created_at_idx" ON "job_queue"("created_at");
CREATE INDEX IF NOT EXISTS "job_queue_status_scheduled_at_idx" ON "job_queue"("status", "scheduled_at");
CREATE INDEX IF NOT EXISTS "job_queue_type_status_idx" ON "job_queue"("type", "status");

