/**
 * Audit Logs Controller
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      page = '1',
      pageSize = '50',
      action,
      entityType,
      userId,
      dateFrom,
      dateTo,
      search
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const size = Math.min(parseInt(pageSize as string, 10), 200);
    const skip = (pageNum - 1) * size;

    // Build where clause
    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo as string);
      }
    }

    if (search) {
      where.OR = [
        { entityId: { contains: search as string, mode: 'insensitive' } },
        { userId: { contains: search as string, mode: 'insensitive' } },
        { ipAddress: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Get total count
    const total = await prisma.auditLog.count({ where });

    // Get logs
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: size
    });

    // Get user info separately if needed
    const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))];
    const users = userIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: userIds as string[] } },
      select: { id: true, email: true, firstName: true, lastName: true }
    }) : [];

    const userMap = new Map(users.map(u => [u.id, u]));

    // Transform logs to include user name
    const transformedLogs = logs.map(log => {
      const user = log.userId ? userMap.get(log.userId) : null;
      return {
        ...log,
        details: log.newData || log.oldData || {},
        userName: user ? `${user.firstName} ${user.lastName}` : undefined
      };
    });

    res.json({
      logs: transformedLogs,
      total,
      page: pageNum,
      pageSize: size
    });
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    next(error);
  }
}

/**
 * Get single audit log by ID
 */
export async function getAuditLog(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({
      where: { id }
    });

    if (!log) {
      res.status(404).json({ message: 'Audit log not found' });
      return;
    }

    // Get user info if available
    let userName: string | undefined;
    if (log.userId) {
      const user = await prisma.user.findUnique({
        where: { id: log.userId },
        select: { firstName: true, lastName: true }
      });
      if (user) {
        userName = `${user.firstName} ${user.lastName}`;
      }
    }

    res.json({
      ...log,
      details: log.newData || log.oldData || {},
      userName
    });
  } catch (error) {
    logger.error('Error fetching audit log:', error);
    next(error);
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { period = '7d' } = req.query;

    let dateFrom: Date;
    const now = new Date();

    switch (period) {
      case '24h':
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get action counts
    const actionCounts = await prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        createdAt: { gte: dateFrom }
      },
      _count: true,
      orderBy: { _count: { action: 'desc' } },
      take: 10
    });

    // Get entity type counts
    const entityTypeCounts = await prisma.auditLog.groupBy({
      by: ['entityType'],
      where: {
        createdAt: { gte: dateFrom }
      },
      _count: true,
      orderBy: { _count: { entityType: 'desc' } }
    });

    // Get user activity counts
    const userActivityCounts = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: dateFrom }
      },
      _count: true,
      orderBy: { _count: { userId: 'desc' } },
      take: 10
    });

    // Get total count
    const totalCount = await prisma.auditLog.count({
      where: {
        createdAt: { gte: dateFrom }
      }
    });

    // Get daily activity
    const dailyActivity = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= ${dateFrom}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    res.json({
      period,
      totalCount,
      actionCounts: actionCounts.map(a => ({ action: a.action, count: a._count })),
      entityTypeCounts: entityTypeCounts.map(e => ({ entityType: e.entityType, count: e._count })),
      userActivityCounts: userActivityCounts.map(u => ({ userId: u.userId, count: u._count })),
      dailyActivity
    });
  } catch (error) {
    logger.error('Error fetching audit log stats:', error);
    next(error);
  }
}

/**
 * Export audit logs as CSV
 */
export async function exportAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { dateFrom, dateTo, action, entityType } = req.query;

    const where: any = {};

    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000 // Limit export to 10k records
    });

    // Get user info for all logs
    const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))];
    const users = userIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: userIds as string[] } },
      select: { id: true, firstName: true, lastName: true }
    }) : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    // Generate CSV
    const headers = ['ID', 'Vreme', 'Akcija', 'Tip entiteta', 'ID entiteta', 'Korisnik', 'IP adresa'];
    const rows = logs.map(log => {
      const user = log.userId ? userMap.get(log.userId) : null;
      return [
        log.id,
        log.createdAt.toISOString(),
        log.action,
        log.entityType,
        log.entityId,
        user ? `${user.firstName} ${user.lastName}` : log.userId || '',
        log.ipAddress || ''
      ];
    });

    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  } catch (error) {
    logger.error('Error exporting audit logs:', error);
    next(error);
  }
}

export default {
  getAuditLogs,
  getAuditLog,
  getAuditLogStats,
  exportAuditLogs
};
