import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3003'),
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/sef_efakture',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '24h',
  
  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // SEF API
  SEF_DEMO_BASE_URL: 'https://demoefaktura.mfin.gov.rs',
  SEF_PROD_BASE_URL: 'https://efaktura.mfin.gov.rs',
  
  // Redis (for Bull Queue)
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // File uploads
  UPLOAD_MAX_SIZE: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760'), // 10MB
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  
  // SEF Webhook
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'your-webhook-secret-change-in-production'
};