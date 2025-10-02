import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { 
  createInvoice, 
  getInvoices, 
  getInvoiceById 
} from '../controllers/invoiceController';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Invoice routes
router.post('/', requireRole(['ADMIN', 'ACCOUNTANT']), createInvoice);
router.get('/', getInvoices);
router.get('/:id', getInvoiceById);

export default router;