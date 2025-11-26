import { Router } from 'express';
import { RecurringInvoiceController } from '../controllers/recurringInvoiceController';

const router = Router();

router.post('/', RecurringInvoiceController.create);
router.get('/', RecurringInvoiceController.getAll);
router.get('/:id', RecurringInvoiceController.getById);
router.patch('/:id', RecurringInvoiceController.update);
router.delete('/:id', RecurringInvoiceController.delete);

export default router;
