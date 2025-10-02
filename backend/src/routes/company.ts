import { Router } from 'express';
// Quick company endpoint
const quickGetCompany = async (req: any, res: any) => {
  try {
    const company = await require('@prisma/client').PrismaClient().company.findUnique({
      where: { id: req.user.companyId }
    });
    res.json({ success: true, data: company });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching company' });
  }
};
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Simple company routes
router.use(authMiddleware);
router.get('/', quickGetCompany);

export default router;