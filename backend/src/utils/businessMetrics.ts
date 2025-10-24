import { register, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from './logger';

/**
 * Custom Business Metrics for SEF eFakture Application
 * 
 * These metrics track business-level operations beyond standard HTTP metrics
 */

// ==================== Invoice Metrics ====================

/**
 * Total number of invoices sent to SEF
 * Labels: status (success, failure), environment (demo, production), company_id
 */
export const invoiceSentTotal = new Counter({
  name: 'sef_invoice_sent_total',
  help: 'Total number of invoices sent to SEF',
  labelNames: ['status', 'environment', 'company_id'],
});

/**
 * Invoice processing success rate (gauge 0-1)
 * Calculated as successful_invoices / total_invoices over last hour
 */
export const invoiceSuccessRate = new Gauge({
  name: 'sef_invoice_success_rate',
  help: 'Success rate of invoice processing (0-1)',
  labelNames: ['environment'],
});

/**
 * Invoice processing duration histogram
 * Tracks time from creation to successful SEF submission
 */
export const invoiceProcessingDuration = new Histogram({
  name: 'sef_invoice_processing_duration_seconds',
  help: 'Time taken to process and send invoice to SEF',
  labelNames: ['environment', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30], // seconds
});

/**
 * Invoice validation errors counter
 * Tracks different types of validation failures
 */
export const invoiceValidationErrors = new Counter({
  name: 'sef_invoice_validation_errors_total',
  help: 'Total number of invoice validation errors',
  labelNames: ['error_type', 'field'],
});

// ==================== Queue Metrics ====================

/**
 * Queue job processing duration
 * Tracks how long jobs stay in the queue
 */
export const queueJobDuration = new Histogram({
  name: 'sef_queue_job_duration_seconds',
  help: 'Duration of queue job processing',
  labelNames: ['queue_name', 'job_type', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60], // seconds
});

/**
 * Active queue jobs gauge
 * Current number of jobs in each state
 */
export const queueJobsActive = new Gauge({
  name: 'sef_queue_jobs_active',
  help: 'Number of active jobs in queue',
  labelNames: ['queue_name', 'state'], // state: waiting, active, completed, failed
});

/**
 * Queue job failures counter
 * Tracks job failures by type and reason
 */
export const queueJobFailures = new Counter({
  name: 'sef_queue_job_failures_total',
  help: 'Total number of failed queue jobs',
  labelNames: ['queue_name', 'job_type', 'failure_reason'],
});

/**
 * Queue retry attempts counter
 * Tracks how many retries are needed
 */
export const queueRetryAttempts = new Counter({
  name: 'sef_queue_retry_attempts_total',
  help: 'Total number of queue job retry attempts',
  labelNames: ['queue_name', 'job_type'],
});

// ==================== SEF API Metrics ====================

/**
 * SEF API response time histogram
 * Tracks latency to SEF government API
 */
export const sefApiResponseTime = new Histogram({
  name: 'sef_api_response_time_seconds',
  help: 'Response time of SEF API calls',
  labelNames: ['endpoint', 'method', 'status_code', 'environment'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60], // seconds
});

/**
 * SEF API errors counter
 * Tracks different error types from SEF API
 */
export const sefApiErrors = new Counter({
  name: 'sef_api_errors_total',
  help: 'Total number of SEF API errors',
  labelNames: ['endpoint', 'error_type', 'status_code', 'environment'],
});

/**
 * SEF API rate limit hits counter
 * Tracks when we hit rate limits
 */
export const sefApiRateLimitHits = new Counter({
  name: 'sef_api_rate_limit_hits_total',
  help: 'Number of times SEF API rate limit was hit',
  labelNames: ['environment'],
});

/**
 * SEF API circuit breaker state gauge
 * 0 = closed (healthy), 1 = open (failing), 0.5 = half-open (testing)
 */
export const sefApiCircuitBreakerState = new Gauge({
  name: 'sef_api_circuit_breaker_state',
  help: 'State of SEF API circuit breaker (0=closed, 1=open, 0.5=half-open)',
  labelNames: ['environment'],
});

// ==================== Database Metrics ====================

/**
 * Database query duration histogram
 * Tracks Prisma query performance
 */
export const databaseQueryDuration = new Histogram({
  name: 'sef_database_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['model', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1], // seconds
});

/**
 * Database connection pool gauge
 * Tracks active/idle connections
 */
export const databaseConnectionPool = new Gauge({
  name: 'sef_database_connections',
  help: 'Number of database connections',
  labelNames: ['state'], // state: active, idle
});

// ==================== Authentication Metrics ====================

/**
 * Login attempts counter
 * Tracks successful and failed logins
 */
export const loginAttempts = new Counter({
  name: 'sef_login_attempts_total',
  help: 'Total number of login attempts',
  labelNames: ['status', 'role'],
});

/**
 * Active sessions gauge
 * Current number of active user sessions
 */
export const activeSessions = new Gauge({
  name: 'sef_active_sessions',
  help: 'Number of active user sessions',
  labelNames: ['role'],
});

/**
 * Token refresh counter
 * Tracks token refresh operations
 */
export const tokenRefreshes = new Counter({
  name: 'sef_token_refreshes_total',
  help: 'Total number of token refresh operations',
  labelNames: ['status'],
});

// ==================== Helper Functions ====================

/**
 * Record invoice sent metric
 */
export function recordInvoiceSent(
  status: 'success' | 'failure',
  environment: 'demo' | 'production',
  companyId: string,
  duration?: number
) {
  invoiceSentTotal.inc({ status, environment, company_id: companyId });
  
  if (duration !== undefined) {
    invoiceProcessingDuration.observe({ environment, status }, duration);
  }
  
  logger.info('Invoice metric recorded', { status, environment, companyId, duration });
}

/**
 * Record SEF API call metric
 */
export function recordSefApiCall(
  endpoint: string,
  method: string,
  statusCode: number,
  environment: 'demo' | 'production',
  duration: number
) {
  sefApiResponseTime.observe(
    { endpoint, method, status_code: statusCode.toString(), environment },
    duration
  );
  
  if (statusCode >= 400) {
    const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
    sefApiErrors.inc({ endpoint, error_type: errorType, status_code: statusCode.toString(), environment });
  }
  
  if (statusCode === 429) {
    sefApiRateLimitHits.inc({ environment });
  }
}

/**
 * Record queue job metric
 */
export function recordQueueJob(
  queueName: string,
  jobType: string,
  status: 'completed' | 'failed',
  duration: number,
  failureReason?: string
) {
  queueJobDuration.observe({ queue_name: queueName, job_type: jobType, status }, duration);
  
  if (status === 'failed' && failureReason) {
    queueJobFailures.inc({ queue_name: queueName, job_type: jobType, failure_reason: failureReason });
  }
}

/**
 * Update queue state metrics
 */
export function updateQueueState(
  queueName: string,
  waiting: number,
  active: number,
  completed: number,
  failed: number
) {
  queueJobsActive.set({ queue_name: queueName, state: 'waiting' }, waiting);
  queueJobsActive.set({ queue_name: queueName, state: 'active' }, active);
  queueJobsActive.set({ queue_name: queueName, state: 'completed' }, completed);
  queueJobsActive.set({ queue_name: queueName, state: 'failed' }, failed);
}

/**
 * Calculate and update invoice success rate
 */
export function updateInvoiceSuccessRate(environment: 'demo' | 'production') {
  // Get counter values
  const successMetric = register.getSingleMetric('sef_invoice_sent_total') as Counter<string>;
  if (!successMetric) return;

  // This is a simplified calculation - in production, you'd want to use a time window
  // For now, we'll update it based on total counts
  const metrics = (successMetric as any).hashMap;
  let successCount = 0;
  let totalCount = 0;

  for (const [labels, value] of Object.entries(metrics)) {
    if (labels.includes(`environment="${environment}"`)) {
      totalCount += (value as any).value;
      if (labels.includes('status="success"')) {
        successCount += (value as any).value;
      }
    }
  }

  const rate = totalCount > 0 ? successCount / totalCount : 1;
  invoiceSuccessRate.set({ environment }, rate);
}

logger.info('✅ Custom Prometheus metrics initialized');
