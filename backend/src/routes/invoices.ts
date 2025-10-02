import { Router } from 'express';
// Quick invoice endpoints
const quickGetInvoices = async (req: any, res: any) => {
  try {
    const invoices = await require('@prisma/client').PrismaClient().invoice.findMany({
      where: {
        OR: [
          { supplierId: req.user.companyId },
          { buyerId: req.user.companyId }
        ]
      },
      include: { supplier: true, buyer: true },
      take: 10
    });
    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching invoices' });
  }
};
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Simple invoice routes
router.use(authMiddleware);
router.get('/', quickGetInvoices);

export default router;