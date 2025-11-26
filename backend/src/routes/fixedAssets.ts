import { Router } from 'express';
import { fixedAssetController } from '../controllers/fixedAssetController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', fixedAssetController.create);
router.get('/', fixedAssetController.list);
router.post('/calculate-amortization', fixedAssetController.calculateAmortization);
router.get('/:id', fixedAssetController.get);
router.put('/:id', fixedAssetController.update);
router.delete('/:id', fixedAssetController.delete);

export default router;
