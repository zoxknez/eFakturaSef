import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

/**
 * Environment configuration schema with Zod validation
 * Ensures all required environment variables are present and valid
 */
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  
  // Security - CRITICAL: Must be strong secrets!
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRE: z.string().default('24h'),
  JWT_REFRESH_EXPIRE: z.string().default('7d'),
  WEBHOOK_SECRET: z.string().min(32, 'WEBHOOK_SECRET must be at least 32 characters for security'),
  SESSION_SECRET: z.string().optional(),
  
  // Frontend
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL').default('http://localhost:3000'),
  
  // SEF API
  SEF_API_KEY: z.string().optional(),
  
  // Redis
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL').optional().default('redis://localhost:6379'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  
  // File uploads
  UPLOAD_MAX_SIZE: z.coerce.number().int().positive().default(10485760), // 10MB
  UPLOAD_DIR: z.string().default('./uploads'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
  
  // Security
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  
  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  
  // Email (Optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().default('noreply@sef-efakture.com'),
});

// Validate environment variables
let validatedEnv: z.infer<typeof envSchema>;

try {
  validatedEnv = envSchema.parse(process.env);
  
  // Additional validation for production
  if (validatedEnv.NODE_ENV === 'production') {
    if (!validatedEnv.SEF_API_KEY) {
      throw new Error('SEF_API_KEY is required in production environment');
    }
    if (validatedEnv.JWT_SECRET.length < 64) {
      throw new Error('JWT_SECRET must be at least 64 characters in production for security');
    }
    if (validatedEnv.WEBHOOK_SECRET.length < 64) {
      throw new Error('WEBHOOK_SECRET must be at least 64 characters in production for security');
    }
  }
  
  console.log('✅ Environment variables validated successfully');
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    error.errors.forEach(err => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

// Export validated and type-safe configuration
export const config = {
  NODE_ENV: validatedEnv.NODE_ENV,
  PORT: validatedEnv.PORT,
  
  // Database
  DATABASE_URL: validatedEnv.DATABASE_URL,
  
  // JWT
  JWT_SECRET: validatedEnv.JWT_SECRET,
  JWT_EXPIRE: validatedEnv.JWT_EXPIRE as string,
  JWT_REFRESH_EXPIRE: validatedEnv.JWT_REFRESH_EXPIRE as string,
  
  // Frontend
  FRONTEND_URL: validatedEnv.FRONTEND_URL,
  
  // SEF API
  SEF_DEMO_BASE_URL: 'https://demoefaktura.mfin.gov.rs',
  SEF_PROD_BASE_URL: 'https://efaktura.mfin.gov.rs',
  SEF_BASE_URL: validatedEnv.NODE_ENV === 'production' 
    ? 'https://efaktura.mfin.gov.rs' 
    : 'https://demoefaktura.mfin.gov.rs',
  SEF_API_KEY: validatedEnv.SEF_API_KEY || '',
  
  // Redis (for Bull Queue)
  REDIS_URL: validatedEnv.REDIS_URL,
  redis: {
    host: validatedEnv.REDIS_HOST,
    port: validatedEnv.REDIS_PORT,
    password: validatedEnv.REDIS_PASSWORD,
  },
  
  // File uploads
  UPLOAD_MAX_SIZE: validatedEnv.UPLOAD_MAX_SIZE,
  UPLOAD_DIR: validatedEnv.UPLOAD_DIR,
  
  // Logging
  LOG_LEVEL: validatedEnv.LOG_LEVEL,
  
  // Security
  BCRYPT_ROUNDS: validatedEnv.BCRYPT_ROUNDS,
  WEBHOOK_SECRET: validatedEnv.WEBHOOK_SECRET,
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: validatedEnv.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS: validatedEnv.RATE_LIMIT_MAX_REQUESTS,
  
  // CORS
  CORS_ORIGINS: validatedEnv.CORS_ORIGINS.split(',').map(origin => origin.trim()),
  
  // Session
  SESSION_SECRET: validatedEnv.SESSION_SECRET || validatedEnv.JWT_SECRET,
  
  // Email (for notifications)
  SMTP_HOST: validatedEnv.SMTP_HOST,
  SMTP_PORT: validatedEnv.SMTP_PORT,
  SMTP_USER: validatedEnv.SMTP_USER,
  SMTP_PASS: validatedEnv.SMTP_PASS,
  FROM_EMAIL: validatedEnv.FROM_EMAIL,
} as const;