import { Router } from 'express';
import { CalculationController } from '../controllers/calculationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Routes
router.get('/', CalculationController.list);
router.get('/:id', CalculationController.getById);
router.post('/', CalculationController.create);
router.post('/from-invoice/:invoiceId', CalculationController.createFromInvoice);
router.post('/:id/post', CalculationController.post);

export default router;
