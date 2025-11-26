import { Router } from 'express';
import { TravelOrderController } from '../controllers/travelOrderController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new TravelOrderController();

router.use(authMiddleware);

router.get('/', controller.getTravelOrders);
router.get('/:id', controller.getTravelOrderById);
router.post('/', controller.createTravelOrder);
router.put('/:id', controller.updateTravelOrder);
router.delete('/:id', controller.deleteTravelOrder);

export default router;
