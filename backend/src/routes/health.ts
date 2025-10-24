// Enhanced health check routes
import express, { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { config } from '../config';
import axios from 'axios';

const router = express.Router();

/**
 * Health check status
 */
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: CheckResult;
    redis: CheckResult;
    sefApi: CheckResult;
  };
}

interface CheckResult {
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
  details?: any;
}

/**
 * Check database health
 */
async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Simple query to check database connection
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;
    
    return {
      status: 'up',
      responseTime,
      details: {
        type: 'postgresql',
      },
    };
  } catch (error: any) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      error: error.message,
    };
  }
}

/**
 * Check Redis health
 */
async function checkRedis(): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Try to import and check Redis clients
    const { default: cache } = await import('../services/cacheService');
    
    // Try a simple get operation
    await cache.get(cache.CachePrefix.STATS, 'health-check');
    
    const responseTime = Date.now() - start;
    return {
      status: 'up',
      responseTime,
      details: {
        host: config.redis.host,
        port: config.redis.port,
      },
    };
  } catch (error: any) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      error: error.message,
    };
  }
}

/**
 * Check SEF API health
 */
async function checkSEFApi(): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Try to reach SEF API (ping endpoint or base URL)
    const response = await axios.get(config.SEF_BASE_URL, {
      timeout: 5000, // 5 second timeout
      validateStatus: () => true, // Accept any status code
    });
    
    const responseTime = Date.now() - start;
    const isUp = response.status < 500; // Consider 4xx as "up" (API is responding)
    
    return {
      status: isUp ? 'up' : 'down',
      responseTime,
      details: {
        baseUrl: config.SEF_BASE_URL,
        statusCode: response.status,
      },
    };
  } catch (error: any) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      error: error.message,
    };
  }
}

/**
 * Calculate overall health status
 */
function calculateOverallStatus(checks: HealthStatus['checks']): HealthStatus['status'] {
  const statuses = Object.values(checks).map(check => check.status);
  
  if (statuses.every(s => s === 'up')) {
    return 'healthy';
  } else if (statuses.every(s => s === 'down')) {
    return 'unhealthy';
  } else {
    return 'degraded';
  }
}

/**
 * GET /health
 * Basic health check endpoint (fast, for load balancers)
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /health/ready
 * Readiness probe (checks if app is ready to serve traffic)
 * Kubernetes-style readiness probe
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database
    const dbCheck = await checkDatabase();
    
    if (dbCheck.status === 'down') {
      return res.status(503).json({
        ready: false,
        reason: 'Database is not ready',
        checks: { database: dbCheck },
      });
    }

    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
      checks: { database: dbCheck },
    });
  } catch (error: any) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      ready: false,
      error: error.message,
    });
  }
});

/**
 * GET /health/live
 * Liveness probe (checks if app is still alive)
 * Kubernetes-style liveness probe
 */
router.get('/live', (req: Request, res: Response) => {
  // Simple check - if we can respond, we're alive
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

/**
 * GET /health/detailed
 * Detailed health check (checks all dependencies)
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    logger.debug('Performing detailed health check');

    // Run all checks in parallel
    const [databaseCheck, redisCheck, sefApiCheck] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkSEFApi(),
    ]);

    const checks = {
      database: databaseCheck,
      redis: redisCheck,
      sefApi: sefApiCheck,
    };

    const overallStatus = calculateOverallStatus(checks);
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks,
    };

    // Set appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthStatus);
  } catch (error: any) {
    logger.error('Detailed health check failed', { error: error.message });
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/metrics
 * System metrics (memory, CPU, etc.)
 */
router.get('/metrics', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: formatBytes(memoryUsage.rss),
      heapTotal: formatBytes(memoryUsage.heapTotal),
      heapUsed: formatBytes(memoryUsage.heapUsed),
      external: formatBytes(memoryUsage.external),
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
    process: {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  });
});

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
}

export default router;

