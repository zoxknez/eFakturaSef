import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { sanitizeInput, blockDangerousPatterns } from './middleware/sanitization';
import { auditLog } from './middleware/auditLogger';
import { requestContext } from './middleware/requestContext';

// Route imports
import authRoutes from './routes/auth';
import invoiceRoutes from './routes/invoices';
import companyRoutes from './routes/company';
import userRoutes from './routes/users';
import sefRoutes from './routes/sef';
import dashboardRoutes from './routes/dashboard';
import webhookRoutes from './routes/webhooks';
import healthRoutes from './routes/health';
import monitoringRoutes from './routes/monitoring';
import configRoutes from './routes/config';
import exportsRoutes from './routes/exports';
import bulkRoutes from './routes/bulk';
import partnerRoutes from './routes/partners';
import productRoutes from './routes/products';
import paymentRoutes from './routes/payments';

// Queue imports
import { invoiceQueue, webhookQueue, closeAllQueues } from './queue';
import scheduledJobs from './queue/scheduledJobs';
import { initIdempotencyRedis, closeIdempotencyRedis } from './middleware/idempotency';
import { initRateLimitRedis, closeRateLimitRedis, rateLimiters } from './middleware/advancedRateLimiting';
import { initCacheRedis, closeCacheRedis } from './services/cacheService';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics';
import { initSentry, Sentry } from './utils/sentry';
import { performStartupChecksOrExit } from './utils/startup-checks';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

const app = express();

// Initialize Sentry (must be first)
initSentry(app);

// Sentry request handler must be the first middleware
app.use(Sentry.Handlers.requestHandler());
// Sentry tracing middleware
app.use(Sentry.Handlers.tracingHandler());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later',
      retryAfter: Math.round(config.RATE_LIMIT_WINDOW_MS / 1000)
    });
  }
});

// Apply rate limiting to all API routes
app.use('/api/', limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth/', authLimiter);

// Request context and tracing (must be early in the middleware stack)
app.use(requestContext);

// Prometheus metrics (track all requests)
app.use(metricsMiddleware);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Input sanitization and security
app.use(sanitizeInput({ 
  allowHTML: false, 
  trimWhitespace: true, 
  removeNullBytes: true 
}));
app.use(blockDangerousPatterns);

// Audit logging (log all important operations)
app.use(auditLog);

// Enhanced health check routes (no auth required)
app.use('/health', healthRoutes);

// Prometheus metrics endpoint (no auth required for monitoring)
app.get('/metrics', metricsEndpoint);

// Monitoring and alerting routes
app.use('/monitoring', monitoringRoutes);

// Configuration and feature flags (public endpoint)
app.use('/config', configRoutes);

// API Documentation (Swagger UI)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SEF eFakture API Docs',
}));

// Swagger JSON spec
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API routes with advanced rate limiting
app.use('/api/auth', rateLimiters.auth, authRoutes);
app.use('/api/invoices', authMiddleware, rateLimiters.invoices, invoiceRoutes);
app.use('/api/partners', authMiddleware, rateLimiters.api, partnerRoutes); // Partner management (šifarnik partnera)
app.use('/api/products', authMiddleware, rateLimiters.api, productRoutes); // Product management (šifarnik proizvoda)
app.use('/api/payments', authMiddleware, rateLimiters.api, paymentRoutes); // Payment tracking
app.use('/api/company', authMiddleware, rateLimiters.api, companyRoutes);
app.use('/api/users', authMiddleware, rateLimiters.api, userRoutes);
app.use('/api/dashboard', authMiddleware, rateLimiters.dashboard, dashboardRoutes);
app.use('/api/sef', rateLimiters.sef, sefRoutes); // SEF endpoints with strict limits
app.use('/api/webhooks', webhookRoutes); // Webhook endpoints (no rate limit - verified by signature)
app.use('/api/exports', exportsRoutes); // Export routes (PDF, Excel)
app.use('/api/bulk', rateLimiters.api, bulkRoutes); // Bulk operations

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Sentry error handler (must be before other error handlers)
app.use(Sentry.Handlers.errorHandler());

// Error handling middleware
app.use(errorHandler);

const PORT = config.PORT || 3001;

// Server instance (will be set after startup checks)
let server: any = null;

// Perform startup checks before starting server
performStartupChecksOrExit().then(async () => {
  server = app.listen(PORT, async () => {
    logger.info(`🚀 SEF eFakture API Server started on port ${PORT}`);
    logger.info(`📝 Environment: ${config.NODE_ENV}`);
    logger.info(`🔗 Frontend URL: ${config.FRONTEND_URL}`);
    logger.info(`📦 Bull Queue initialized (Invoice & Webhook processing)`);
    logger.info(`🔴 Redis connection: ${config.redis.host}:${config.redis.port}`);
  
    // Initialize idempotency Redis
    try {
      await initIdempotencyRedis();
      logger.info(`🔁 Idempotency Redis initialized`);
    } catch (error: any) {
      logger.warn(`⚠️  Idempotency Redis failed, using in-memory fallback`, {
        error: error.message,
      });
    }
    
    // Initialize advanced rate limiting Redis
    try {
      await initRateLimitRedis();
      logger.info(`🚦 Advanced rate limiting Redis initialized`);
    } catch (error: any) {
      logger.warn(`⚠️  Rate limiting Redis failed, using in-memory fallback`, {
        error: error.message,
      });
    }
    
    // Initialize caching Redis
    try {
      await initCacheRedis();
      logger.info(`📦 Caching Redis initialized`);
    } catch (error: any) {
      logger.warn(`⚠️  Caching Redis failed, using in-memory fallback`, {
        error: error.message,
      });
    }
    
    // Start scheduled jobs (cron)
    scheduledJobs.start();
  });
}).catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new requests
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Stop scheduled jobs
      scheduledJobs.stop();
      logger.info('Scheduled jobs stopped');
      
      // Close queue connections
      await closeAllQueues();
      logger.info('All queues closed');
      
      // Close idempotency Redis
      await closeIdempotencyRedis();
      logger.info('Idempotency Redis closed');
      
      // Close rate limiting Redis
      await closeRateLimitRedis();
      logger.info('Rate limiting Redis closed');
      
      // Close caching Redis
      await closeCacheRedis();
      logger.info('Caching Redis closed');
      
      // Exit process
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  gracefulShutdown('unhandledRejection');
});

export default app;