import { Router } from 'express';
import { pettyCashController } from '../controllers/pettyCashController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Accounts
router.post('/accounts', pettyCashController.createAccount);
router.get('/accounts', pettyCashController.getAccounts);
router.get('/accounts/:id', pettyCashController.getAccount);
router.get('/accounts/:accountId/next-number', pettyCashController.getNextEntryNumber);

// Entries
router.post('/entries', pettyCashController.createEntry);
router.get('/entries', pettyCashController.listEntries);

export default router;
