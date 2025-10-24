import express from 'express';
import { CompanyController } from '../controllers/companyController';

const router = express.Router();

/**
 * @openapi
 * /api/company:
 *   get:
 *     summary: Get company details
 *     description: Retrieve company information for the authenticated user
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', CompanyController.get);

/**
 * @openapi
 * /api/company:
 *   post:
 *     summary: Create new company
 *     description: Register a new company in the system
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - pib
 *               - address
 *               - city
 *               - postalCode
 *             properties:
 *               name:
 *                 type: string
 *                 example: Moja Firma DOO
 *               pib:
 *                 type: string
 *                 pattern: '^[0-9]{9}$'
 *                 example: '987654321'
 *               address:
 *                 type: string
 *                 example: Kneza Miloša 10
 *               city:
 *                 type: string
 *                 example: Beograd
 *               postalCode:
 *                 type: string
 *                 example: '11000'
 *               country:
 *                 type: string
 *                 example: RS
 *                 default: RS
 *               sefApiKey:
 *                 type: string
 *                 description: SEF API key (optional)
 *               sefEnvironment:
 *                 type: string
 *                 enum: [DEMO, PRODUCTION]
 *                 default: DEMO
 *     responses:
 *       201:
 *         description: Company created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         description: Company with this PIB already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', CompanyController.create);

/**
 * @openapi
 * /api/company:
 *   put:
 *     summary: Update company details
 *     description: Update company information for the authenticated user's company
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               country:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               bankAccount:
 *                 type: string
 *               sefApiKey:
 *                 type: string
 *               sefEnvironment:
 *                 type: string
 *                 enum: [DEMO, PRODUCTION]
 *               autoStockDeduction:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Company updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/', CompanyController.update);

export default router;
