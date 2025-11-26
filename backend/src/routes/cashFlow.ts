/**
 * Cash Flow Routes
 * Cash flow prognoza i alarmi
 */

import { Router } from 'express';
import { CashFlowController } from '../controllers/cashFlowController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get daily cash flow forecast
router.get('/daily', CashFlowController.getDailyForecast);

// Get weekly summary
router.get('/weekly', CashFlowController.getWeeklySummary);

// Get monthly summary for year
router.get('/monthly/:year', CashFlowController.getMonthlySummary);

// Get cash flow alerts
router.get('/alerts', CashFlowController.getAlerts);

export default router;
