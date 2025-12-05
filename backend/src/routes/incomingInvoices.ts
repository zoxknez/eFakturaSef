import { Router } from 'express';
import { IncomingInvoiceController } from '../controllers/incomingInvoiceController';

const router = Router();

// Status counts routes (before :id routes)
router.get('/counts', IncomingInvoiceController.getStatusCounts);
router.get('/payment-counts', IncomingInvoiceController.getPaymentCounts);

// Bulk operations
router.post('/bulk/status', IncomingInvoiceController.bulkUpdateStatus);

// Sync from SEF
router.post('/sync', IncomingInvoiceController.syncFromSef);

// CRUD operations
router.post('/', IncomingInvoiceController.create);
router.get('/', IncomingInvoiceController.list);
router.get('/:id', IncomingInvoiceController.getById);
router.patch('/:id/status', IncomingInvoiceController.updateStatus);
router.post('/:id/map-product', IncomingInvoiceController.mapLineProduct);

export default router;
