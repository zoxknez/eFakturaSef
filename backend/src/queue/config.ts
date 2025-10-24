// Queue configuration and setup
import Bull from 'bull';
import { config } from '../config';

// Redis connection configuration
const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Default job options
export const defaultJobOptions: Bull.JobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000, // 2 seconds initial delay
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 500, // Keep last 500 failed jobs
};

// Night pause configuration (01:00-06:00)
export const isNightPause = (): boolean => {
  const hour = new Date().getHours();
  return hour >= 1 && hour < 6;
};

// Calculate delay for night pause
export const getNightPauseDelay = (): number => {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= 1 && hour < 6) {
    // Calculate delay until 06:00
    const resumeTime = new Date();
    resumeTime.setHours(6, 0, 0, 0);
    return resumeTime.getTime() - now.getTime();
  }
  
  return 0;
};

export { redisConfig };

