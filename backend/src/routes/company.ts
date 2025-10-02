import { Router } from 'express';
import prisma from '../db/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';

// Quick company endpoint
const quickGetCompany = async (req: AuthRequest, res: any) => {
  try {
    const companyId = req.user!.companyId;
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    res.json({ success: true, data: company });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching company' });
  }
};

const router = Router();

// Simple company routes
router.use(authMiddleware);
router.get('/', quickGetCompany);

export default router;
