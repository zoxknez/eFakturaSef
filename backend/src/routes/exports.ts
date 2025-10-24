// Export routes for PDF and Excel generation
import express, { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { generateInvoicePDF, generateInvoicesExcel, generateInvoiceReport } from '../services/exportService';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Apply auth middleware to all export routes
router.use(authMiddleware);

/**
 * GET /exports/invoice/:id/pdf
 * Export single invoice as PDF
 */
router.get('/invoice/:id/pdf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        companyId: user.companyId, // Security: only user's company invoices
      },
      include: {
        lines: true,
        company: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await generateInvoicePDF(invoice, res);
  } catch (error: any) {
    logger.error('Failed to export invoice PDF', { error: error.message });
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

/**
 * GET /exports/invoices/excel
 * Export multiple invoices as Excel
 */
router.get('/invoices/excel', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, dateFrom, dateTo } = req.query;

    const where: any = {
      companyId: user.companyId,
    };

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) {
        where.issueDate.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.issueDate.lte = new Date(dateTo as string);
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        lines: true,
        company: true,
      },
      orderBy: { issueDate: 'desc' },
      take: 1000, // Max 1000 invoices per export
    });

    if (invoices.length === 0) {
      return res.status(404).json({ error: 'No invoices found for export' });
    }

    await generateInvoicesExcel(invoices, res);
  } catch (error: any) {
    logger.error('Failed to export invoices Excel', { error: error.message });
    res.status(500).json({ error: 'Failed to generate Excel' });
  }
});

/**
 * GET /exports/report/excel
 * Export comprehensive report with summary
 */
router.get('/report/excel', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, dateFrom, dateTo } = req.query;

    const where: any = {
      companyId: user.companyId,
    };

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) {
        where.issueDate.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.issueDate.lte = new Date(dateTo as string);
      }
    }

    const [invoices, total, draft, sent, accepted, rejected] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          lines: true,
          company: true,
        },
        orderBy: { issueDate: 'desc' },
        take: 1000,
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.count({ where: { ...where, status: 'DRAFT' } }),
      prisma.invoice.count({ where: { ...where, status: 'SENT' } }),
      prisma.invoice.count({ where: { ...where, status: 'ACCEPTED' } }),
      prisma.invoice.count({ where: { ...where, status: 'REJECTED' } }),
    ]);

    const totalRevenue = invoices
      .filter((inv) => inv.status === 'ACCEPTED')
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    const pendingRevenue = invoices
      .filter((inv) => inv.status === 'SENT')
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    const summary = {
      total,
      draft,
      sent,
      accepted,
      rejected,
      totalRevenue,
      pendingRevenue,
    };

    await generateInvoiceReport(invoices, summary, res);
  } catch (error: any) {
    logger.error('Failed to export report', { error: error.message });
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;

