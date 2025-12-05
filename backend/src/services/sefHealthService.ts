/**
 * SEF Health Monitoring Service
 * 
 * Monitors SEF API health, queue status, and error rates
 */

import { prisma } from '../db/prisma';
import { invoiceQueue } from '../queue/invoiceQueue';
import cacheService, { CachePrefix } from './cacheService';
import { logger } from '../utils/logger';
import axios from 'axios';
import type { SEFHealthStatus } from '@sef-app/shared';

// Store for tracking SEF ping results
interface PingRecord {
  timestamp: Date;
  latencyMs: number;
  success: boolean;
  error?: string;
}

// In-memory ping history (last 100 pings)
const pingHistory: PingRecord[] = [];
const MAX_PING_HISTORY = 100;

// Last successful ping info
let lastSuccessfulPing: { timestamp: Date; latencyMs: number } | null = null;

export class SEFHealthService {
  /**
   * Ping SEF API and record result
   * Uses a lightweight endpoint check without requiring authentication
   */
  static async pingSEF(isDemo: boolean = true): Promise<PingRecord> {
    const startTime = Date.now();
    let record: PingRecord;

    const baseUrl = isDemo 
      ? 'https://demoefaktura.mfin.gov.rs'
      : 'https://efaktura.mfin.gov.rs';

    try {
      // Simple HTTP HEAD request to check if SEF is reachable
      await axios.head(baseUrl, { 
        timeout: 5000,
        validateStatus: () => true // Accept any status to check connectivity
      });
      
      const latencyMs = Date.now() - startTime;
      record = {
        timestamp: new Date(),
        latencyMs,
        success: true
      };

      lastSuccessfulPing = {
        timestamp: record.timestamp,
        latencyMs
      };

    } catch (error: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      record = {
        timestamp: new Date(),
        latencyMs,
        success: false,
        error: errorMessage
      };

      logger.warn('[SEF Health] Ping failed', { error: errorMessage, latencyMs });
    }

    // Store in history
    pingHistory.unshift(record);
    if (pingHistory.length > MAX_PING_HISTORY) {
      pingHistory.pop();
    }

    return record;
  }

  /**
   * Get Queue Statistics
   */
  static async getQueueStats(): Promise<SEFHealthStatus['queueStats']> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        invoiceQueue.getWaitingCount(),
        invoiceQueue.getActiveCount(),
        invoiceQueue.getCompletedCount(),
        invoiceQueue.getFailedCount(),
        invoiceQueue.getDelayedCount()
      ]);

      return { waiting, active, completed, failed, delayed };
    } catch (error) {
      logger.error('[SEF Health] Failed to get queue stats', error);
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
  }

  /**
   * Get error statistics for last 24 hours
   */
  static async getErrorStats24h(companyId: string): Promise<{ errors: number; total: number; successRate: number }> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      const [errorCount, totalCount] = await Promise.all([
        prisma.invoice.count({
          where: {
            companyId,
            updatedAt: { gte: twentyFourHoursAgo },
            status: 'REJECTED'
          }
        }),
        prisma.invoice.count({
          where: {
            companyId,
            updatedAt: { gte: twentyFourHoursAgo },
            status: { not: 'DRAFT' }
          }
        })
      ]);

      const successRate = totalCount > 0 
        ? Math.round(((totalCount - errorCount) / totalCount) * 100) 
        : 100;

      return {
        errors: errorCount,
        total: totalCount,
        successRate
      };
    } catch (error) {
      logger.error('[SEF Health] Failed to get error stats', error);
      return { errors: 0, total: 0, successRate: 100 };
    }
  }

  /**
   * Calculate retry trend (compare last 24h with previous 24h)
   * Uses failed job counts from queue as proxy for retries
   */
  static async getRetryTrend(companyId: string): Promise<{ value: number; positive: boolean }> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    try {
      // Count rejected invoices as proxy for failed attempts
      const [current, previous] = await Promise.all([
        prisma.invoice.count({
          where: {
            companyId,
            updatedAt: { gte: twentyFourHoursAgo },
            status: 'REJECTED'
          }
        }),
        prisma.invoice.count({
          where: {
            companyId,
            updatedAt: { gte: fortyEightHoursAgo, lt: twentyFourHoursAgo },
            status: 'REJECTED'
          }
        })
      ]);

      if (previous === 0) {
        return { value: 0, positive: true };
      }

      const percentChange = Math.round(((current - previous) / previous) * 100);
      
      return {
        value: Math.abs(percentChange),
        positive: percentChange <= 0 // Fewer rejections is positive
      };
    } catch (error) {
      logger.error('[SEF Health] Failed to get retry trend', error);
      return { value: 0, positive: true };
    }
  }

  /**
   * Get last successful sync timestamp
   */
  static async getLastSuccessfulSync(companyId: string): Promise<string | null> {
    try {
      const lastSynced = await prisma.invoice.findFirst({
        where: {
          companyId,
          status: { in: ['SENT', 'ACCEPTED', 'DELIVERED'] },
          sefId: { not: null }
        },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
      });

      return lastSynced?.updatedAt?.toISOString() || null;
    } catch (error) {
      logger.error('[SEF Health] Failed to get last sync', error);
      return null;
    }
  }

  /**
   * Get complete SEF Health Status
   */
  static async getHealthStatus(companyId: string): Promise<SEFHealthStatus> {
    const cacheKey = `${companyId}:health`;
    
    return cacheService.getOrSet(
      CachePrefix.DASHBOARD,
      cacheKey,
      async () => {
        // Get company to determine environment
        const company = await prisma.company.findUnique({
          where: { id: companyId },
          select: { sefEnvironment: true }
        });

        const isDemo = company?.sefEnvironment !== 'production';

        const [queueStats, errorStats, retryTrend, lastSync] = await Promise.all([
          this.getQueueStats(),
          this.getErrorStats24h(companyId),
          this.getRetryTrend(companyId),
          this.getLastSuccessfulSync(companyId)
        ]);

        // Calculate if SEF is online based on recent ping history
        const recentPings = pingHistory.slice(0, 5);
        const isOnline = recentPings.length === 0 || 
          recentPings.filter(p => p.success).length >= Math.ceil(recentPings.length / 2);

        return {
          isOnline,
          lastPingAt: lastSuccessfulPing?.timestamp.toISOString() || null,
          lastPingLatencyMs: lastSuccessfulPing?.latencyMs || null,
          queueStats,
          errors24h: errorStats.errors,
          successRate24h: errorStats.successRate,
          retryTrend,
          environment: isDemo ? 'demo' : 'production',
          lastSuccessfulSync: lastSync
        };
      },
      30 // Cache for 30 seconds
    );
  }

  /**
   * Force refresh health status (invalidate cache and recalculate)
   */
  static async refreshHealthStatus(companyId: string): Promise<SEFHealthStatus> {
    // Invalidate cache
    await cacheService.invalidate.dashboard(companyId);

    // Get company environment
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { sefEnvironment: true }
    });
    
    // Do a fresh ping
    await this.pingSEF(company?.sefEnvironment !== 'production');

    return this.getHealthStatus(companyId);
  }
}
