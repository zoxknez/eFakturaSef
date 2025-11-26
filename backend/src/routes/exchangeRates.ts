/**
 * Exchange Rate Routes
 * NBS Kursna lista i konverzije
 */

import { Router } from 'express';
import { ExchangeRateController } from '../controllers/exchangeRateController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get today's rates
router.get('/today', ExchangeRateController.getTodayRates);

// Get rate for specific currency and date
router.get('/rate', ExchangeRateController.getRate);

// Get rate history for a currency
router.get('/history/:currency', ExchangeRateController.getHistory);

// Convert amount between currencies
router.post('/convert', ExchangeRateController.convert);

// Manually trigger rate update (admin only)
router.post(
  '/update',
  requireRole(['ADMIN']),
  ExchangeRateController.updateRates
);

export default router;
