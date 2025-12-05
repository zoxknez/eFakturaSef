import { Request, Response } from 'express';
import { IncomingInvoiceService, CreateIncomingInvoiceDTO } from '../services/incomingInvoiceService';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { IncomingInvoiceStatus, InvoicePaymentStatus } from '@prisma/client';

// Validation Schemas
const createSchema = z.object({
  invoiceNumber: z.string().min(1),
  issueDate: z.string(),
  dueDate: z.string().optional(),
  supplierName: z.string().min(1),
  supplierPIB: z.string().length(9),
  supplierAddress: z.string().optional(),
  totalAmount: z.number(),
  taxAmount: z.number(),
  currency: z.string().default('RSD'),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    taxRate: z.number(),
    amount: z.number()
  })).min(1),
  paymentStatus: z.nativeEnum(InvoicePaymentStatus).optional()
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(IncomingInvoiceStatus),
  reason: z.string().optional()
});

const bulkStatusSchema = z.object({
  invoiceIds: z.array(z.string().uuid()),
  status: z.nativeEnum(IncomingInvoiceStatus),
  reason: z.string().optional()
});

export class IncomingInvoiceController {
  
  static async create(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const data = createSchema.parse(req.body);
    
    const invoice = await IncomingInvoiceService.create(
      authReq.user!.companyId,
      data as CreateIncomingInvoiceDTO,
      authReq.user!.id
    );
    
    res.status(201).json({ success: true, data: invoice });
  }

  static async list(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const filters = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      search: req.query.search as string,
      status: req.query.status as IncomingInvoiceStatus,
      paymentStatus: req.query.paymentStatus as InvoicePaymentStatus,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      supplierPIB: req.query.supplierPIB as string,
      sortBy: req.query.sortBy as 'issueDate' | 'receivedDate' | 'totalAmount' | 'invoiceNumber' | 'dueDate' | undefined,
      sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined
    };

    const result = await IncomingInvoiceService.list(authReq.user!.companyId, filters);
    res.json({ success: true, ...result });
  }

  static async getById(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const invoice = await IncomingInvoiceService.getById(req.params.id, authReq.user!.companyId);
    res.json({ success: true, data: invoice });
  }

  static async updateStatus(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const { status, reason } = updateStatusSchema.parse(req.body);
    
    const invoice = await IncomingInvoiceService.updateStatus(
      req.params.id,
      authReq.user!.companyId,
      status,
      authReq.user!.id,
      reason
    );
    
    res.json({ success: true, data: invoice });
  }

  static async syncFromSef(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const result = await IncomingInvoiceService.syncFromSef(
      authReq.user!.companyId,
      authReq.user!.id
    );
    
    res.json({ success: true, data: result });
  }

  static async mapLineProduct(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const { lineId, productId } = req.body;
    
    if (!lineId) {
      return res.status(400).json({ error: 'Line ID is required' });
    }

    const result = await IncomingInvoiceService.mapLineProduct(
      req.params.id,
      authReq.user!.companyId,
      lineId,
      productId || null
    );
    
    res.json({ success: true, data: result });
  }

  static async getStatusCounts(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const counts = await IncomingInvoiceService.getStatusCounts(authReq.user!.companyId);
    res.json({ success: true, data: counts });
  }

  static async getPaymentCounts(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const counts = await IncomingInvoiceService.getPaymentCounts(authReq.user!.companyId);
    res.json({ success: true, data: counts });
  }

  static async bulkUpdateStatus(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const { invoiceIds, status, reason } = bulkStatusSchema.parse(req.body);
    
    const result = await IncomingInvoiceService.bulkUpdateStatus(
      authReq.user!.companyId,
      invoiceIds,
      status,
      authReq.user!.id,
      reason
    );
    
    res.json({ success: true, data: result });
  }
}
