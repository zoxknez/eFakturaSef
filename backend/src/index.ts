import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { requestLogger } from './middleware/requestLogger';
// import { authMiddleware } from './middleware/auth';
import prisma from './db/prisma';
import getQueues from './queue';

// Route imports
import authRoutes from './routes/auth';
import invoiceRoutes from './routes/invoices';
import companyRoutes from './routes/company';
import webhookRoutes from './routes/webhooks';
import queueRoutes from './routes/queue';

const app = express();
app.use(requestId);
app.use(requestLogger);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = new Set([config.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001']);
    const isVercel = origin ? /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin) : false;
    if (!origin || allowed.has(origin) || isVercel) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Mount webhooks BEFORE JSON body-parser to preserve raw body for signature verification
app.use('/api/webhooks', webhookRoutes); // SEF webhooks and management

// Body parsing middleware (applies to typical API routes)
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  const started = Date.now();
  // DB check
  let db: { ok: boolean; latencyMs?: number; error?: string } = { ok: false };
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    db = { ok: true, latencyMs: Date.now() - t0 };
  } catch (e: any) {
    db = { ok: false, error: e?.message || 'DB error' };
  }

  // Queue/Redis check (non-blocking; enabled=false if REDIS not configured)
  let queue: { enabled: boolean; ok: boolean } = { enabled: false, ok: false };
  try {
    const q = getQueues();
    queue = { enabled: !!q.enabled, ok: !!q.enabled };
  } catch {
    queue = { enabled: false, ok: false };
  }

  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptimeSec: Math.round(process.uptime()),
    latencyMs: Date.now() - started,
    checks: {
      db,
      queue
    }
  });
});

// Swagger setup
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SEF eFakture API',
      version: process.env.npm_package_version || '1.0.0'
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {},
            requestId: { type: 'string' }
          }
        },
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            invoiceNumber: { type: 'string' },
            issueDate: { type: 'string', format: 'date-time' },
            dueDate: { type: 'string', format: 'date-time' },
            direction: { type: 'string' },
            status: { type: 'string' },
            documentType: { type: 'string' },
            supplierId: { type: 'string' },
            buyerId: { type: 'string' },
            subtotal: { type: 'number' },
            totalVat: { type: 'number' },
            totalAmount: { type: 'number' },
            currency: { type: 'string' }
          }
        }
      }
    }
  },
  apis: [
    `${__dirname}/routes/*.ts`
  ],
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes); // Auth handled in routes
app.use('/api/company', companyRoutes); // Auth handled in routes
app.use('/api/queue', queueRoutes); // Queue operations (send, metrics)

// 404 handler (standardized shape)
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// Error handling middleware
app.use(errorHandler);

const PORT = config.PORT || 3001;

// Only start the server when not running tests
let server: import('http').Server | undefined;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    logger.info(`🚀 SEF eFakture API Server started on port ${PORT}`);
    logger.info(`📝 Environment: ${config.NODE_ENV}`);
    logger.info(`🔗 Frontend URL: ${config.FRONTEND_URL}`);
  });

  const shutdown = async (signal: string) => {
    try {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      if (server) {
        await new Promise<void>((resolve) => server!.close(() => resolve()));
      }
      await prisma.$disconnect();
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default app;
