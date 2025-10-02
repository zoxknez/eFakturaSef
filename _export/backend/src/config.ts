// Redacted config excerpt matching backend/src/config.ts
export const config = {
  NODE_ENV: 'development',
  PORT: 3003,
  DATABASE_URL: 'postgresql://USER:***@localhost:5432/DB',
  JWT_SECRET: '***',
  JWT_EXPIRE: '24h',
  FRONTEND_URL: 'http://localhost:3001',
  SEF_DEMO_BASE_URL: 'https://demoefaktura.mfin.gov.rs',
  SEF_PROD_BASE_URL: 'https://efaktura.mfin.gov.rs',
  REDIS_URL: 'redis://localhost:6379',
  UPLOAD_MAX_SIZE: 10485760,
  UPLOAD_DIR: './uploads',
  LOG_LEVEL: 'info',
  BCRYPT_ROUNDS: 12,
  WEBHOOK_SECRET: '***'
};
