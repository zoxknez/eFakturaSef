/**
 * Startup validation checks
 * Runs before the server starts to ensure all dependencies are available
 */

import { prisma } from '../db/prisma';
import { createClient } from 'redis';
import { config } from '../config';
import { sefService } from '../services/sefService';
import { logger } from '../utils/logger';

export interface StartupCheckResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

/**
 * Perform all startup checks
 */
export async function performStartupChecks(): Promise<{
  success: boolean;
  results: StartupCheckResult[];
}> {
  console.log('\n🔍 Performing startup checks...\n');
  
  const results: StartupCheckResult[] = [];
  let hasError = false;

  // 1. Check database connection
  const dbCheck = await checkDatabase();
  results.push(dbCheck);
  if (dbCheck.status === 'error') hasError = true;

  // 2. Check Redis connection
  const redisCheck = await checkRedis();
  results.push(redisCheck);
  if (redisCheck.status === 'error') hasError = true;

  // 3. Check environment configuration
  const envCheck = checkEnvironmentConfig();
  results.push(envCheck);
  if (envCheck.status === 'error') hasError = true;

  // 4. Check SEF API (only in production)
  if (config.NODE_ENV === 'production') {
    const sefCheck = await checkSEFAPI();
    results.push(sefCheck);
    // SEF check is warning only, not critical
  }

  // 5. Check file system permissions
  const fsCheck = await checkFileSystemPermissions();
  results.push(fsCheck);
  if (fsCheck.status === 'error') hasError = true;

  // Print results
  console.log('\n📊 Startup Check Results:\n');
  results.forEach(result => {
    const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details)}`);
    }
  });
  console.log('');

  if (hasError) {
    console.error('❌ Startup checks failed! Server cannot start.\n');
    return { success: false, results };
  }

  console.log('✅ All critical startup checks passed!\n');
  return { success: true, results };
}

/**
 * Check database connection and basic query
 */
async function checkDatabase(): Promise<StartupCheckResult> {
  try {
    await prisma.$connect();
    
    // Try a simple query
    const userCount = await prisma.user.count();
    
    return {
      name: 'Database Connection',
      status: 'success',
      message: 'PostgreSQL connection successful',
      details: {
        users: userCount,
        databaseUrl: config.DATABASE_URL.replace(/:[^:]*@/, ':****@'), // Hide password
      },
    };
  } catch (error: any) {
    return {
      name: 'Database Connection',
      status: 'error',
      message: `Failed to connect to database: ${error.message}`,
      details: {
        error: error.message,
        code: error.code,
      },
    };
  }
}

/**
 * Check Redis connection
 */
async function checkRedis(): Promise<StartupCheckResult> {
  let client: ReturnType<typeof createClient> | null = null;
  
  try {
    client = createClient({
      url: config.REDIS_URL,
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
    });

    await client.connect();
    const pong = await client.ping();
    await client.quit();

    if (pong !== 'PONG') {
      throw new Error('Redis ping did not return PONG');
    }

    return {
      name: 'Redis Connection',
      status: 'success',
      message: 'Redis connection successful',
      details: {
        host: config.redis.host,
        port: config.redis.port,
      },
    };
  } catch (error: any) {
    return {
      name: 'Redis Connection',
      status: 'error',
      message: `Failed to connect to Redis: ${error.message}`,
      details: {
        error: error.message,
        host: config.redis.host,
        port: config.redis.port,
      },
    };
  } finally {
    if (client && client.isOpen) {
      await client.quit();
    }
  }
}

/**
 * Check environment configuration
 */
function checkEnvironmentConfig(): StartupCheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check required secrets
  if (config.JWT_SECRET.length < 32) {
    issues.push('JWT_SECRET is too short (minimum 32 characters)');
  }

  if (config.WEBHOOK_SECRET.length < 32) {
    issues.push('WEBHOOK_SECRET is too short (minimum 32 characters)');
  }

  // Production-specific checks
  if (config.NODE_ENV === 'production') {
    if (!config.SEF_API_KEY) {
      issues.push('SEF_API_KEY is required in production');
    }

    if (config.JWT_SECRET.length < 64) {
      warnings.push('JWT_SECRET should be at least 64 characters in production');
    }

    if (config.WEBHOOK_SECRET.length < 64) {
      warnings.push('WEBHOOK_SECRET should be at least 64 characters in production');
    }

    if (config.LOG_LEVEL === 'debug' || config.LOG_LEVEL === 'verbose') {
      warnings.push('LOG_LEVEL should be "info" or "warn" in production');
    }
  }

  if (issues.length > 0) {
    return {
      name: 'Environment Configuration',
      status: 'error',
      message: 'Invalid environment configuration',
      details: { issues, warnings },
    };
  }

  if (warnings.length > 0) {
    return {
      name: 'Environment Configuration',
      status: 'warning',
      message: 'Environment configuration has warnings',
      details: { warnings },
    };
  }

  return {
    name: 'Environment Configuration',
    status: 'success',
    message: 'Environment configuration is valid',
    details: {
      nodeEnv: config.NODE_ENV,
      port: config.PORT,
      logLevel: config.LOG_LEVEL,
    },
  };
}

/**
 * Check SEF API connectivity (production only)
 */
async function checkSEFAPI(): Promise<StartupCheckResult> {
  try {
    const isHealthy = await sefService.healthCheck();

    if (!isHealthy) {
      return {
        name: 'SEF API Connection',
        status: 'warning',
        message: 'SEF API health check failed (not critical)',
        details: {
          baseUrl: config.SEF_BASE_URL,
        },
      };
    }

    return {
      name: 'SEF API Connection',
      status: 'success',
      message: 'SEF API is reachable',
      details: {
        baseUrl: config.SEF_BASE_URL,
      },
    };
  } catch (error: any) {
    return {
      name: 'SEF API Connection',
      status: 'warning',
      message: `SEF API check failed: ${error.message} (not critical)`,
      details: {
        error: error.message,
        baseUrl: config.SEF_BASE_URL,
      },
    };
  }
}

/**
 * Check file system permissions
 */
async function checkFileSystemPermissions(): Promise<StartupCheckResult> {
  const fs = require('fs').promises;
  const path = require('path');

  const issues: string[] = [];

  try {
    // Check upload directory
    const uploadDir = path.resolve(config.UPLOAD_DIR);
    try {
      await fs.access(uploadDir);
    } catch {
      // Directory doesn't exist, try to create it
      try {
        await fs.mkdir(uploadDir, { recursive: true });
      } catch (error: any) {
        issues.push(`Cannot create upload directory: ${error.message}`);
      }
    }

    // Check logs directory
    const logsDir = path.resolve('./logs');
    try {
      await fs.access(logsDir);
    } catch {
      // Directory doesn't exist, try to create it
      try {
        await fs.mkdir(logsDir, { recursive: true });
      } catch (error: any) {
        issues.push(`Cannot create logs directory: ${error.message}`);
      }
    }

    // Try writing a test file
    const testFile = path.join(uploadDir, '.write-test');
    try {
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
    } catch (error: any) {
      issues.push(`Cannot write to upload directory: ${error.message}`);
    }

    if (issues.length > 0) {
      return {
        name: 'File System Permissions',
        status: 'error',
        message: 'File system permission issues detected',
        details: { issues },
      };
    }

    return {
      name: 'File System Permissions',
      status: 'success',
      message: 'File system permissions are correct',
      details: {
        uploadDir,
        logsDir,
      },
    };
  } catch (error: any) {
    return {
      name: 'File System Permissions',
      status: 'error',
      message: `File system check failed: ${error.message}`,
      details: { error: error.message },
    };
  }
}

/**
 * Exit process with error if startup checks fail
 */
export async function performStartupChecksOrExit(): Promise<void> {
  const { success, results } = await performStartupChecks();

  if (!success) {
    logger.error('Startup checks failed, exiting', { results });
    process.exit(1);
  }

  logger.info('Startup checks passed', {
    results: results.map(r => ({ name: r.name, status: r.status })),
  });
}

export default {
  performStartupChecks,
  performStartupChecksOrExit,
};
