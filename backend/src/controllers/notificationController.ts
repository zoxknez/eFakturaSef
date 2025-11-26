/**
 * Notifications Controller
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Get user notifications
 */
export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(notifications);
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    next(error);
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const count = await prisma.notification.count({
      where: { userId, isRead: false }
    });

    res.json({ count });
  } catch (error) {
    logger.error('Error fetching unread count:', error);
    next(error);
  }
}

/**
 * Mark notifications as read
 */
export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    const { ids } = req.body;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!ids || !Array.isArray(ids)) {
      res.status(400).json({ message: 'IDs array required' });
      return;
    }

    await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userId
      },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking notifications as read:', error);
    next(error);
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    next(error);
  }
}

/**
 * Delete notifications
 */
export async function deleteNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    const { ids } = req.body;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!ids || !Array.isArray(ids)) {
      res.status(400).json({ message: 'IDs array required' });
      return;
    }

    await prisma.notification.deleteMany({
      where: {
        id: { in: ids },
        userId
      }
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting notifications:', error);
    next(error);
  }
}

/**
 * Create a notification (internal use)
 */
export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {}
      }
    });
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create notification for all users with specific role
 */
export async function notifyByRole(role: UserRole, notification: {
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}) {
  try {
    const users = await prisma.user.findMany({
      where: { role, isActive: true },
      select: { id: true }
    });

    if (users.length === 0) return;

    await prisma.notification.createMany({
      data: users.map(user => ({
        userId: user.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {}
      }))
    });

    logger.info(`Notified ${users.length} users with role ${role}`);
  } catch (error) {
    logger.error('Error notifying by role:', error);
    throw error;
  }
}

/**
 * Create invoice notification helper
 */
export async function notifyInvoiceEvent(
  userId: string,
  event: 'sent' | 'accepted' | 'rejected' | 'cancelled',
  invoice: { id: string; invoiceNumber: string; customerName: string; totalAmount: number }
) {
  const eventConfig = {
    sent: {
      type: 'INVOICE_SENT',
      title: 'Faktura uspešno poslata',
      message: `Faktura ${invoice.invoiceNumber} za ${invoice.customerName} je poslata na SEF.`
    },
    accepted: {
      type: 'INVOICE_ACCEPTED',
      title: 'Faktura prihvaćena',
      message: `Faktura ${invoice.invoiceNumber} za ${invoice.customerName} je prihvaćena.`
    },
    rejected: {
      type: 'INVOICE_REJECTED',
      title: 'Faktura odbijena',
      message: `Faktura ${invoice.invoiceNumber} za ${invoice.customerName} je odbijena.`
    },
    cancelled: {
      type: 'INVOICE_CANCELLED',
      title: 'Faktura stornirana',
      message: `Faktura ${invoice.invoiceNumber} je stornirana.`
    }
  };

  const config = eventConfig[event];

  return createNotification({
    userId,
    type: config.type,
    title: config.title,
    message: config.message,
    data: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      amount: invoice.totalAmount
    }
  });
}

/**
 * Create payment notification helper
 */
export async function notifyPaymentEvent(
  userId: string,
  event: 'received' | 'overdue',
  payment: { id: string; invoiceNumber: string; amount: number; customerName?: string }
) {
  if (event === 'received') {
    return createNotification({
      userId,
      type: 'PAYMENT_RECEIVED',
      title: 'Plaćanje primljeno',
      message: `Primljeno plaćanje od ${payment.amount.toLocaleString('sr-RS')} RSD za fakturu ${payment.invoiceNumber}.`,
      data: {
        paymentId: payment.id,
        invoiceNumber: payment.invoiceNumber,
        amount: payment.amount
      }
    });
  } else {
    return createNotification({
      userId,
      type: 'PAYMENT_OVERDUE',
      title: 'Rok plaćanja istekao',
      message: `Faktura ${payment.invoiceNumber} za ${payment.customerName || 'kupca'} je prekoračila rok plaćanja.`,
      data: {
        invoiceNumber: payment.invoiceNumber,
        amount: payment.amount
      }
    });
  }
}

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotifications,
  createNotification,
  notifyByRole,
  notifyInvoiceEvent,
  notifyPaymentEvent
};
