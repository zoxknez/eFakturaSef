import { Router } from 'express';
import { quickLogin, quickProfile } from '../controllers/quickAuthController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Simple auth routes for testing
router.post('/login', quickLogin);
router.get('/profile', authMiddleware, quickProfile);

export default router;