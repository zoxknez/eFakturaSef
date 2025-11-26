import { Router } from 'express';
import { IncomingInvoiceController } from '../controllers/incomingInvoiceController';

const router = Router();

router.post('/', IncomingInvoiceController.create);
router.get('/', IncomingInvoiceController.list);
router.post('/sync', IncomingInvoiceController.syncFromSef);
router.get('/:id', IncomingInvoiceController.getById);
router.patch('/:id/status', IncomingInvoiceController.updateStatus);
router.post('/:id/map-product', IncomingInvoiceController.mapLineProduct);

export default router;
