// Enhanced webhook signature verification middleware
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';
import { prisma } from '../db/prisma';

// Store nonces in-memory (for production, use Redis)
const nonceCache = new Map<string, number>();

// Cleanup old nonces periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;
  
  for (const [nonce, timestamp] of nonceCache.entries()) {
    if (now - timestamp > FIVE_MINUTES) {
      nonceCache.delete(nonce);
    }
  }
}, 5 * 60 * 1000);

export interface WebhookPayload {
  timestamp?: string | number;
  nonce?: string;
  [key: string]: any;
}

/**
 * Verify webhook signature with enhanced security
 * - Validates HMAC signature
 * - Checks timestamp to prevent replay attacks
 * - Tracks nonces to prevent duplicate processing
 */
export const verifyWebhookSignature = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signatureHeader = req.get('X-SEF-Signature');
    const timestampHeader = req.get('X-SEF-Timestamp');
    const nonceHeader = req.get('X-SEF-Nonce');

    if (!config.WEBHOOK_SECRET) {
      logger.warn('WEBHOOK_SECRET not configured, skipping verification');
      return next();
    }

    // 1. Check signature presence
    if (!signatureHeader) {
      logger.warn('Webhook signature missing');
      return res.status(401).json({ 
        success: false, 
        error: 'Missing webhook signature' 
      });
    }

    // 2. Validate timestamp (must be within 5 minutes)
    const timestamp = timestampHeader || req.body.timestamp;
    if (timestamp) {
      const webhookTime = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
      const now = Date.now();
      const MAX_TIMESTAMP_DIFF = 5 * 60 * 1000; // 5 minutes

      if (Math.abs(now - webhookTime) > MAX_TIMESTAMP_DIFF) {
        logger.warn('Webhook timestamp too old or in future', {
          webhookTime,
          now,
          diff: now - webhookTime,
        });
        return res.status(401).json({ 
          success: false, 
          error: 'Webhook timestamp expired or invalid' 
        });
      }
    } else {
      logger.warn('Webhook timestamp missing');
      // Optional: make this required in production
      // return res.status(401).json({ success: false, error: 'Missing timestamp' });
    }

    // 3. Check nonce for replay protection
    const nonce = nonceHeader || req.body.nonce;
    if (nonce) {
      if (nonceCache.has(nonce)) {
        logger.warn('Duplicate webhook nonce detected - possible replay attack', { nonce });
        return res.status(401).json({ 
          success: false, 
          error: 'Duplicate request detected' 
        });
      }
      
      // Store nonce with timestamp
      nonceCache.set(nonce, Date.now());
      
      // Limit cache size (prevent memory exhaustion)
      if (nonceCache.size > 10000) {
        const firstKey = nonceCache.keys().next().value;
        if (firstKey !== undefined) {
          nonceCache.delete(firstKey);
        }
      }
    }

    // 4. Verify HMAC signature
    const payloadString = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', config.WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');

    // Support both formats: "sha256=..." and raw hex
    const receivedSignature = signatureHeader.startsWith('sha256=')
      ? signatureHeader.substring(7)
      : signatureHeader;

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );

    if (!isValid) {
      logger.warn('Invalid webhook signature', {
        received: receivedSignature.substring(0, 10) + '...',
        expected: expectedSignature.substring(0, 10) + '...',
      });
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid signature' 
      });
    }

    // Signature is valid
    logger.debug('Webhook signature verified successfully');
    next();
  } catch (error: any) {
    logger.error('Webhook verification error', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ 
      success: false, 
      error: 'Verification failed' 
    });
  }
};

/**
 * Alternative: Redis-backed nonce tracking for distributed systems
 * Uncomment and use this if you have Redis available
 */
/*
import { Redis } from 'ioredis';

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
});

export const verifyWebhookSignatureWithRedis = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // ... same timestamp and signature validation as above ...

    // Redis-backed nonce tracking
    const nonce = nonceHeader || req.body.nonce;
    if (nonce) {
      const nonceKey = `webhook:nonce:${nonce}`;
      const exists = await redis.exists(nonceKey);
      
      if (exists) {
        logger.warn('Duplicate webhook nonce detected', { nonce });
        return res.status(401).json({ 
          success: false, 
          error: 'Duplicate request detected' 
        });
      }
      
      // Store nonce with 5-minute expiration
      await redis.setex(nonceKey, 300, Date.now().toString());
    }

    next();
  } catch (error: any) {
    logger.error('Webhook verification error', error);
    return res.status(500).json({ success: false, error: 'Verification failed' });
  }
};
*/

