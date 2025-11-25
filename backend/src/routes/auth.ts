import express from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email and password, returns access and refresh tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid credentials or account deactivated
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/login', AuthController.login);

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register new user
 *     description: Create a new user account with company association
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - companyId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               companyId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: User with this email already exists
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/register', AuthController.register);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Generate a new access token using a valid refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token obtained from login
 *     responses:
 *       200:
 *         description: New access token generated successfully
 *       400:
 *         description: Refresh token is required
 *       401:
 *         description: Invalid or expired refresh token
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/refresh', AuthController.refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Invalidate user session (revokes refresh token)
 *     tags: [Auth]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/logout', AuthController.logout);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current user info
 *     description: Returns information about the currently authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User info retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/me', authMiddleware, AuthController.me);

export default router;
