import express from 'express';
import { DashboardController } from '../controllers/dashboardController';

const router = express.Router();

// NEW Dashboard endpoints (with caching)
router.get('/overview', DashboardController.getOverview);
router.get('/charts', DashboardController.getCharts);
router.get('/recent', DashboardController.getRecent);
router.get('/alerts', DashboardController.getAlerts);

// SEF Health endpoints
router.get('/sef-health', DashboardController.getSEFHealth);
router.post('/sef-health/refresh', DashboardController.refreshSEFHealth);

// LEGACY Dashboard endpoints (kept for backward compatibility)
router.get('/stats', DashboardController.getStats);
router.get('/activity', DashboardController.getRecentActivity);

export default router;
