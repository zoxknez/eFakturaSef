/**
 * Notifications Routes
 */

import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotifications
} from '../controllers/notificationController';

const router = Router();

// Get all notifications for current user
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark specific notifications as read
router.post('/mark-read', markAsRead);

// Mark all as read
router.post('/mark-all-read', markAllAsRead);

// Delete notifications
router.delete('/', deleteNotifications);

export default router;
