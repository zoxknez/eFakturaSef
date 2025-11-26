// Prometheus metrics middleware
import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
import { logger } from '../utils/logger';

// Enable default metrics (CPU, memory, etc.)
const register = new client.Registry();
let stopDefaultMetrics: (() => void) | undefined;

// Only start default metrics if not in test environment or if explicitly requested
if (process.env.NODE_ENV !== 'test') {
  const interval = client.collectDefaultMetrics({
    register,
    prefix: 'sef_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  });
  // Type assertion or check if it's a function (depends on prom-client version)
  // In newer versions it returns void and manages interval internally, 
  // but register.clear() might be needed.
  // Actually, collectDefaultMetrics returns a clearInterval function.
  stopDefaultMetrics = interval as unknown as () => void;
}

export const stopMetrics = () => {
  if (stopDefaultMetrics) {
    stopDefaultMetrics();
  }
  register.clear();
};

// Custom metrics

// HTTP request duration histogram
export const httpRequestDuration = new client.Histogram({
  name: 'sef_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// HTTP request counter
export const httpRequestTotal = new client.Counter({
  name: 'sef_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Active connections gauge
export const activeConnections = new client.Gauge({
  name: 'sef_active_connections',
  help: 'Number of active connections',
  registers: [register],
});

// Invoice metrics
export const invoicesSent = new client.Counter({
  name: 'sef_invoices_sent_total',
  help: 'Total number of invoices sent to SEF',
  labelNames: ['status'],
  registers: [register],
});

export const invoicesCreated = new client.Counter({
  name: 'sef_invoices_created_total',
  help: 'Total number of invoices created',
  registers: [register],
});

export const invoiceProcessingDuration = new client.Histogram({
  name: 'sef_invoice_processing_duration_seconds',
  help: 'Duration of invoice processing in seconds',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

// SEF API metrics
export const sefApiCalls = new client.Counter({
  name: 'sef_api_calls_total',
  help: 'Total number of calls to SEF API',
  labelNames: ['endpoint', 'status'],
  registers: [register],
});

export const sefApiLatency = new client.Histogram({
  name: 'sef_api_latency_seconds',
  help: 'Latency of SEF API calls in seconds',
  labelNames: ['endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

// Queue metrics
export const queueJobsProcessed = new client.Counter({
  name: 'sef_queue_jobs_processed_total',
  help: 'Total number of queue jobs processed',
  labelNames: ['queue', 'status'],
  registers: [register],
});

export const queueJobDuration = new client.Histogram({
  name: 'sef_queue_job_duration_seconds',
  help: 'Duration of queue job processing in seconds',
  labelNames: ['queue'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [register],
});

export const queueSize = new client.Gauge({
  name: 'sef_queue_size',
  help: 'Current size of the queue',
  labelNames: ['queue'],
  registers: [register],
});

// Database metrics
export const dbQueryDuration = new client.Histogram({
  name: 'sef_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const dbConnectionPool = new client.Gauge({
  name: 'sef_db_connection_pool_size',
  help: 'Size of the database connection pool',
  labelNames: ['state'],
  registers: [register],
});

// Cache metrics
export const cacheHits = new client.Counter({
  name: 'sef_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register],
});

export const cacheMisses = new client.Counter({
  name: 'sef_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register],
});

// Error metrics
export const errorCount = new client.Counter({
  name: 'sef_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'severity'],
  registers: [register],
});

// Business metrics
export const revenue = new client.Gauge({
  name: 'sef_revenue_total',
  help: 'Total revenue from accepted invoices',
  labelNames: ['currency'],
  registers: [register],
});

/**
 * Middleware to track HTTP metrics
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Increment active connections
  activeConnections.inc();

  // Track response
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    // Record metrics
    httpRequestDuration.labels(method, route, statusCode.toString()).observe(duration);
    httpRequestTotal.labels(method, route, statusCode.toString()).inc();
    
    // Decrement active connections
    activeConnections.dec();
  });

  next();
};

/**
 * Endpoint to expose Prometheus metrics
 */
export const metricsEndpoint = async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error: any) {
    logger.error('Failed to collect metrics', { error: error.message });
    res.status(500).end('Failed to collect metrics');
  }
};

/**
 * Helper function to track invoice operations
 */
export const trackInvoiceOperation = (operation: string, duration: number) => {
  invoiceProcessingDuration.labels(operation).observe(duration);
};

/**
 * Helper function to track SEF API calls
 */
export const trackSefApiCall = (endpoint: string, duration: number, status: string) => {
  sefApiCalls.labels(endpoint, status).inc();
  sefApiLatency.labels(endpoint).observe(duration);
};

/**
 * Helper function to track queue jobs
 */
export const trackQueueJob = (queue: string, duration: number, status: 'completed' | 'failed') => {
  queueJobsProcessed.labels(queue, status).inc();
  queueJobDuration.labels(queue).observe(duration);
};

/**
 * Helper function to update queue size
 */
export const updateQueueSize = (queue: string, size: number) => {
  queueSize.labels(queue).set(size);
};

/**
 * Helper function to track cache operations
 */
export const trackCacheOperation = (cacheType: string, hit: boolean) => {
  if (hit) {
    cacheHits.labels(cacheType).inc();
  } else {
    cacheMisses.labels(cacheType).inc();
  }
};

/**
 * Helper function to track errors
 */
export const trackError = (type: string, severity: 'low' | 'medium' | 'high' | 'critical') => {
  errorCount.labels(type, severity).inc();
};

/**
 * Helper function to update revenue
 */
export const updateRevenue = (amount: number, currency: string = 'RSD') => {
  revenue.labels(currency).set(amount);
};

export { register };
export default {
  middleware: metricsMiddleware,
  endpoint: metricsEndpoint,
  register,
  trackInvoiceOperation,
  trackSefApiCall,
  trackQueueJob,
  updateQueueSize,
  trackCacheOperation,
  trackError,
  updateRevenue,
};

