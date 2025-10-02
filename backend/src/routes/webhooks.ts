import { Router } from 'express';
// Simple webhook placeholder
const simpleWebhook = (req: any, res: any) => {
  console.log('SEF Webhook received:', req.body);
  res.json({ success: true, message: 'Webhook received' });
};
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Simple webhook endpoint
router.post('/sef', simpleWebhook);

export default router;