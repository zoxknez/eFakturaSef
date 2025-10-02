// src/routes/settings.ts

import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import {
  getSettings,
  updateSettings,
  testSEFConnection,
  exportSettings,
  importSettings,
  syncWithSEF,
} from '../controllers/settingsController';

const router = Router();

// Require authentication for all settings routes
router.use(authMiddleware);

/**
 * @openapi
 * /api/settings:
 *   get:
 *     summary: Dobij trenutne postavke kompanije
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Postavke kompanije
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Company not found
 */
router.get('/', getSettings);

/**
 * @openapi
 * /api/settings:
 *   put:
 *     summary: Ažuriraj postavke kompanije
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               apiKey:
 *                 type: string
 *               companyName:
 *                 type: string
 *               pib:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               postalCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Postavke ažurirane
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/', requireRole(['ADMIN', 'RAČUNOVOĐA']), updateSettings);

/**
 * @openapi
 * /api/settings/test-sef:
 *   post:
 *     summary: Testiraj SEF API konekciju
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test rezultat
 *       400:
 *         description: API ključ nije konfigurisan
 *       401:
 *         description: Unauthorized
 */
router.post('/test-sef', requireRole(['ADMIN', 'RAČUNOVOĐA']), testSEFConnection);

/**
 * @openapi
 * /api/settings/export:
 *   get:
 *     summary: Izvezi konfiguraciju
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: JSON config file
 *       401:
 *         description: Unauthorized
 */
router.get('/export', requireRole(['ADMIN']), exportSettings);

/**
 * @openapi
 * /api/settings/import:
 *   post:
 *     summary: Uvezi konfiguraciju
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Konfiguracija uvezena
 *       400:
 *         description: Neispravna konfiguracija
 *       401:
 *         description: Unauthorized
 */
router.post('/import', requireRole(['ADMIN']), importSettings);

/**
 * @openapi
 * /api/settings/sync-sef:
 *   post:
 *     summary: Sinhronizuj sa SEF sistemom
 *     description: Pokreće sinhronizaciju sa SEF API-jem za ažuriranje faktura i statusa
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sinhronizacija uspešno pokrenuta
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Sinhronizacija je uspešno završena"
 *       400:
 *         description: SEF API ključ nije konfigurisan
 *       401:
 *         description: Neautorizovano
 *       500:
 *         description: Interna greška servera
 */
router.post('/sync-sef', syncWithSEF);

export default router;
