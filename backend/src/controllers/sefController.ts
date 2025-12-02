/**
 * SEF Controller - API routes for Serbian Electronic Invoice System
 * Based on official API documentation
 * @see https://efaktura.gov.rs
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db/prisma';
import { 
  SEFService, 
  createSEFService, 
  SEFConfig,
  SEFInvoiceStatus,
  SEFVatPeriod,
  SEFVatPeriodRange,
  SEFSendToCir,
  isNightPause,
  getMinutesUntilNightPauseEnds,
  SEFValidationError,
  SEFNetworkError,
  SEFServerError,
  SEFAuthenticationError,
  SEFRateLimitError,
  SEFGroupVatDto,
  SEFIndividualVatDto,
} from '../services/sefService';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const sendInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  sendToCir: z.enum(['Yes', 'No']).optional(),
  executeValidation: z.boolean().optional().default(true),
});

const cancelInvoiceSchema = z.object({
  sefInvoiceId: z.number(),
  cancelComments: z.string().min(1, 'Cancel comments are required'),
});

const stornoInvoiceSchema = z.object({
  sefInvoiceId: z.number(),
  stornoNumber: z.string().optional(),
  stornoComment: z.string().min(1, 'Storno comment is required'),
});

const acceptRejectSchema = z.object({
  sefInvoiceId: z.number(),
  comment: z.string().optional(),
});

const dateRangeSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.string().optional(),
});

const groupVatRecordingSchema = z.object({
  year: z.number().min(2020).max(2100),
  vatPeriod: z.nativeEnum(SEFVatPeriod),
  calculationNumber: z.string().min(1),
  vatReductionFromPreviousPeriodAmount: z.number().default(0),
  vatIncreaseFromPreviousPeriodAmount: z.number().default(0),
  turnoverWithFee: z.object({
    taxableAmount20: z.number().default(0),
    taxAmount20: z.number().default(0),
    taxableAmount10: z.number().default(0),
    taxAmount10: z.number().default(0),
  }).optional(),
  turnoverWithoutFee: z.object({
    taxableAmount20: z.number().default(0),
    taxAmount20: z.number().default(0),
    taxableAmount10: z.number().default(0),
    taxAmount10: z.number().default(0),
  }).optional(),
});

const individualVatRecordingSchema = z.object({
  year: z.number().min(2020).max(2100),
  vatPeriod: z.nativeEnum(SEFVatPeriod),
  calculationNumber: z.string().min(1),
  documentNumber: z.string().optional(),
  documentType: z.string(),
  documentDirection: z.string(),
  turnoverAmount: z.number().default(0),
  vatBaseAmount20: z.number().default(0),
  vatBaseAmount10: z.number().default(0),
  vatAmount20: z.number().default(0),
  vatAmount10: z.number().default(0),
  relatedPartyIdentifier: z.string().optional(),
  foreignDocument: z.boolean().default(false),
});

const vatDeductionSchema = z.object({
  VatDeductionRecordNumber: z.string().min(1),
  TaxId: z.string().length(9, 'PIB must be 9 digits'),
  Year: z.number().min(2020).max(2100),
  VatPeriodRange: z.nativeEnum(SEFVatPeriodRange),
  VatPeriod: z.nativeEnum(SEFVatPeriod),
  GetAnalyticalBreakdown: z.boolean().optional(),
  TurnoverAsSupplier: z.any().optional(),
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get SEF service instance for a company
 */
async function getServiceForCompany(companyId: string): Promise<SEFService> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { sefApiKey: true, sefEnvironment: true }
  });

  if (!company) {
    throw new AppError('Company not found', 404);
  }

  if (!company.sefApiKey) {
    throw new AppError('SEF API key not configured for this company', 400);
  }

  const config: SEFConfig = {
    apiKey: company.sefApiKey,
    baseUrl: company.sefEnvironment === 'production' 
      ? 'https://efaktura.mfin.gov.rs' 
      : 'https://demoefaktura.mfin.gov.rs',
    environment: company.sefEnvironment as 'demo' | 'production',
  };

  return createSEFService(config);
}

/**
 * Handle SEF errors and send appropriate response
 */
function handleSEFError(error: unknown, res: Response): void {
  if (error instanceof SEFValidationError) {
    res.status(400).json({
      success: false,
      error: error.message,
      errorCode: error.errorCode,
      details: error.sefResponse,
    });
    return;
  }

  if (error instanceof SEFAuthenticationError) {
    res.status(401).json({
      success: false,
      error: 'SEF authentication failed. Check API key.',
    });
    return;
  }

  if (error instanceof SEFRateLimitError) {
    res.status(429).json({
      success: false,
      error: error.message,
      retryAfter: error.retryAfter,
    });
    return;
  }

  if (error instanceof SEFNetworkError) {
    res.status(503).json({
      success: false,
      error: 'SEF service temporarily unavailable',
    });
    return;
  }

  if (error instanceof SEFServerError) {
    res.status(502).json({
      success: false,
      error: 'SEF server error',
      statusCode: error.statusCode,
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
    return;
  }

  logger.error('Unhandled SEF error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}

// =====================================================
// CONTROLLER CLASS
// =====================================================

export class SEFController {
  
  // =====================================================
  // UTILITY ENDPOINTS
  // =====================================================

  /**
   * GET /api/sef/unit-measures
   */
  static async getUnitMeasures(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sefService = await getServiceForCompany(req.user!.companyId);
      const unitMeasures = await sefService.getUnitMeasures();
      res.json({ success: true, data: unitMeasures });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/vat-exemption-reasons
   */
  static async getVatExemptionReasons(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sefService = await getServiceForCompany(req.user!.companyId);
      const reasons = await sefService.getVatExemptionReasons();
      res.json({ success: true, data: reasons });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/version
   */
  static async getVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sefService = await getServiceForCompany(req.user!.companyId);
      const version = await sefService.getVersion();
      res.json({ success: true, data: { version } });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/health
   */
  static async healthCheck(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sefService = await getServiceForCompany(req.user!.companyId);
      const isHealthy = await sefService.healthCheck();
      res.json({ 
        success: true, 
        data: { 
          healthy: isHealthy,
          nightPause: isNightPause(),
          minutesUntilNightPauseEnds: isNightPause() ? getMinutesUntilNightPauseEnds() : 0,
        } 
      });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  // =====================================================
  // SALES INVOICE ENDPOINTS
  // =====================================================

  /**
   * POST /api/sef/sales-invoice/send
   */
  static async sendSalesInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Check night pause
      if (isNightPause()) {
        res.status(503).json({
          success: false,
          error: 'SEF is in night pause (00:00-06:00)',
          retryAfterMinutes: getMinutesUntilNightPauseEnds(),
        });
        return;
      }

      const validation = sendInvoiceSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, errors: validation.error.errors });
        return;
      }

      const { invoiceId, sendToCir, executeValidation } = validation.data;
      const companyId = req.user!.companyId;

      // Get invoice
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, companyId },
        include: {
          lines: true,
          partner: true,
          company: true,
        },
      });

      if (!invoice) {
        res.status(404).json({ success: false, error: 'Invoice not found' });
        return;
      }

      // TODO: Generate UBL using UBLGenerator service
      const ublXml = ''; // await ublGenerator.generate(invoice);

      const sefService = await getServiceForCompany(companyId);
      const requestId = uuidv4();

      const result = await sefService.sendSalesInvoiceUBL(ublXml, requestId, {
        sendToCir: sendToCir as SEFSendToCir,
        executeValidation,
      });

      // Update invoice with SEF data
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          sefId: result.SalesInvoiceId.toString(),
          sefStatus: 'Sent',
          sentAt: new Date(),
        },
      });

      logger.info(`Invoice ${invoiceId} sent to SEF`, { sefInvoiceId: result.SalesInvoiceId });
      res.json({ success: true, data: result });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/sales-invoice/:invoiceId
   */
  static async getSalesInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sefInvoiceId = parseInt(req.params.invoiceId);
      if (isNaN(sefInvoiceId)) {
        res.status(400).json({ success: false, error: 'Invalid invoice ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const invoice = await sefService.getSalesInvoice(sefInvoiceId);
      res.json({ success: true, data: invoice });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * DELETE /api/sef/sales-invoice/:invoiceId
   */
  static async deleteSalesInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sefInvoiceId = parseInt(req.params.invoiceId);
      if (isNaN(sefInvoiceId)) {
        res.status(400).json({ success: false, error: 'Invalid invoice ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      await sefService.deleteSalesInvoice(sefInvoiceId);
      res.json({ success: true, message: 'Invoice deleted from SEF' });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * POST /api/sef/sales-invoice/cancel
   */
  static async cancelSalesInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = cancelInvoiceSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, errors: validation.error.errors });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const result = await sefService.cancelSalesInvoice({
        invoiceId: validation.data.sefInvoiceId,
        cancelComments: validation.data.cancelComments,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * POST /api/sef/sales-invoice/storno
   */
  static async stornoSalesInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = stornoInvoiceSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, errors: validation.error.errors });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const result = await sefService.stornoSalesInvoice({
        invoiceId: validation.data.sefInvoiceId,
        stornoNumber: validation.data.stornoNumber,
        stornoComment: validation.data.stornoComment,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/sales-invoice/:invoiceId/xml
   */
  static async getSalesInvoiceXml(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sefInvoiceId = parseInt(req.params.invoiceId);
      if (isNaN(sefInvoiceId)) {
        res.status(400).json({ success: false, error: 'Invalid invoice ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const xml = await sefService.getSalesInvoiceXml(sefInvoiceId);
      
      res.set('Content-Type', 'application/xml');
      res.set('Content-Disposition', `attachment; filename="invoice-${sefInvoiceId}.xml"`);
      res.send(xml);
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/sales-invoice/:invoiceId/pdf
   */
  static async getSalesInvoicePdf(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sefInvoiceId = parseInt(req.params.invoiceId);
      if (isNaN(sefInvoiceId)) {
        res.status(400).json({ success: false, error: 'Invalid invoice ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const pdf = await sefService.getSalesInvoicePdf(sefInvoiceId);
      
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `attachment; filename="invoice-${sefInvoiceId}.pdf"`);
      res.send(pdf);
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/sales-invoice/:invoiceId/signature
   */
  static async getSalesInvoiceSignature(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sefInvoiceId = parseInt(req.params.invoiceId);
      if (isNaN(sefInvoiceId)) {
        res.status(400).json({ success: false, error: 'Invalid invoice ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const signature = await sefService.getSalesInvoiceSignature(sefInvoiceId);
      
      res.set('Content-Type', 'application/octet-stream');
      res.send(signature);
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/sales-invoice/changes
   */
  static async getSalesInvoiceChanges(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const date = req.query.date as string;
      if (!date) {
        res.status(400).json({ success: false, error: 'Date parameter required' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const changes = await sefService.getSalesInvoiceChanges(date);
      res.json({ success: true, data: changes });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/sales-invoice/ids
   */
  static async getSalesInvoiceIds(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = dateRangeSchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json({ success: false, errors: validation.error.errors });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const ids = await sefService.getSalesInvoiceIds({
        dateFrom: validation.data.dateFrom,
        dateTo: validation.data.dateTo,
        status: validation.data.status as SEFInvoiceStatus,
      });
      res.json({ success: true, data: ids });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  // =====================================================
  // PURCHASE INVOICE ENDPOINTS
  // =====================================================

  /**
   * GET /api/sef/purchase-invoice/:invoiceId
   */
  static async getPurchaseInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sefInvoiceId = parseInt(req.params.invoiceId);
      if (isNaN(sefInvoiceId)) {
        res.status(400).json({ success: false, error: 'Invalid invoice ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const invoice = await sefService.getPurchaseInvoice(sefInvoiceId);
      res.json({ success: true, data: invoice });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * POST /api/sef/purchase-invoice/accept
   */
  static async acceptPurchaseInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = acceptRejectSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, errors: validation.error.errors });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const result = await sefService.acceptPurchaseInvoice({
        invoiceId: validation.data.sefInvoiceId,
        comment: validation.data.comment,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * POST /api/sef/purchase-invoice/reject
   */
  static async rejectPurchaseInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = acceptRejectSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, errors: validation.error.errors });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const result = await sefService.rejectPurchaseInvoice({
        invoiceId: validation.data.sefInvoiceId,
        comment: validation.data.comment,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/purchase-invoice/:invoiceId/xml
   */
  static async getPurchaseInvoiceXml(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sefInvoiceId = parseInt(req.params.invoiceId);
      if (isNaN(sefInvoiceId)) {
        res.status(400).json({ success: false, error: 'Invalid invoice ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const xml = await sefService.getPurchaseInvoiceXml(sefInvoiceId);
      
      res.set('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/purchase-invoice/:invoiceId/pdf
   */
  static async getPurchaseInvoicePdf(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sefInvoiceId = parseInt(req.params.invoiceId);
      if (isNaN(sefInvoiceId)) {
        res.status(400).json({ success: false, error: 'Invalid invoice ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const pdf = await sefService.getPurchaseInvoicePdf(sefInvoiceId);
      
      res.set('Content-Type', 'application/pdf');
      res.send(pdf);
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/purchase-invoice/changes
   */
  static async getPurchaseInvoiceChanges(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const date = req.query.date as string;
      if (!date) {
        res.status(400).json({ success: false, error: 'Date parameter required' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const changes = await sefService.getPurchaseInvoiceChanges(date);
      res.json({ success: true, data: changes });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  // =====================================================
  // VAT RECORDING ENDPOINTS (Zbirna i Pojedinačna evidencija)
  // =====================================================

  /**
   * GET /api/sef/vat-recording/group
   */
  static async getGroupVatRecordings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = dateRangeSchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json({ success: false, errors: validation.error.errors });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const recordings = await sefService.getGroupVatRecordings(validation.data);
      res.json({ success: true, data: recordings });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * POST /api/sef/vat-recording/group
   */
  static async createGroupVatRecording(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = groupVatRecordingSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, errors: validation.error.errors });
        return;
      }

      const data = validation.data;
      const groupVatDto: SEFGroupVatDto = {
        Year: data.year,
        VatPeriod: data.vatPeriod,
        CalculationNumber: data.calculationNumber,
        VatReductionFromPreviousPeriodAmount: data.vatReductionFromPreviousPeriodAmount,
        VatIncreaseFromPreviousPeriodAmount: data.vatIncreaseFromPreviousPeriodAmount,
        TurnoverWithFee: data.turnoverWithFee ? {
          TaxableAmount20: data.turnoverWithFee.taxableAmount20,
          TaxAmount20: data.turnoverWithFee.taxAmount20,
          TotalAmount20: data.turnoverWithFee.taxableAmount20 + data.turnoverWithFee.taxAmount20,
          TaxableAmount10: data.turnoverWithFee.taxableAmount10,
          TaxAmount10: data.turnoverWithFee.taxAmount10,
          TotalAmount10: data.turnoverWithFee.taxableAmount10 + data.turnoverWithFee.taxAmount10,
        } : undefined,
        TurnoverWithoutFee: data.turnoverWithoutFee ? {
          TaxableAmount20: data.turnoverWithoutFee.taxableAmount20,
          TaxAmount20: data.turnoverWithoutFee.taxAmount20,
          TotalAmount20: data.turnoverWithoutFee.taxableAmount20 + data.turnoverWithoutFee.taxAmount20,
          TaxableAmount10: data.turnoverWithoutFee.taxableAmount10,
          TaxAmount10: data.turnoverWithoutFee.taxAmount10,
          TotalAmount10: data.turnoverWithoutFee.taxableAmount10 + data.turnoverWithoutFee.taxAmount10,
        } : undefined,
      };

      const sefService = await getServiceForCompany(req.user!.companyId);
      const result = await sefService.createGroupVatRecording(groupVatDto);
      res.json({ success: true, data: result });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/vat-recording/group/:id
   */
  static async getGroupVatRecording(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const groupVatId = parseInt(req.params.id);
      if (isNaN(groupVatId)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const recording = await sefService.getGroupVatRecording(groupVatId);
      res.json({ success: true, data: recording });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * POST /api/sef/vat-recording/group/:id/cancel
   */
  static async cancelGroupVatRecording(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const groupVatId = parseInt(req.params.id);
      if (isNaN(groupVatId)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      await sefService.cancelGroupVatRecording(groupVatId);
      res.json({ success: true, message: 'Group VAT recording cancelled' });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/vat-recording/individual
   */
  static async getIndividualVatRecordings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = dateRangeSchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json({ success: false, errors: validation.error.errors });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const recordings = await sefService.getIndividualVatRecordings(validation.data);
      res.json({ success: true, data: recordings });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * POST /api/sef/vat-recording/individual
   */
  static async createIndividualVatRecording(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = individualVatRecordingSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, errors: validation.error.errors });
        return;
      }

      const data = validation.data;
      const individualVatDto: SEFIndividualVatDto = {
        Year: data.year,
        VatPeriod: data.vatPeriod,
        CalculationNumber: data.calculationNumber,
        DocumentNumber: data.documentNumber,
        DocumentType: data.documentType,
        DocumentDirection: data.documentDirection,
        TurnoverAmount: data.turnoverAmount,
        VatBaseAmount20: data.vatBaseAmount20,
        VatBaseAmount10: data.vatBaseAmount10,
        VatAmount: data.vatAmount20 + data.vatAmount10,
        VatAmount20: data.vatAmount20,
        VatAmount10: data.vatAmount10,
        TotalAmount: data.turnoverAmount,
        RelatedPartyIdentifier: data.relatedPartyIdentifier,
        ForeignDocument: data.foreignDocument,
      };

      const sefService = await getServiceForCompany(req.user!.companyId);
      const result = await sefService.createIndividualVatRecording(individualVatDto);
      res.json({ success: true, data: result });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/vat-recording/individual/:id
   */
  static async getIndividualVatRecording(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const individualVatId = parseInt(req.params.id);
      if (isNaN(individualVatId)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const recording = await sefService.getIndividualVatRecording(individualVatId);
      res.json({ success: true, data: recording });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * POST /api/sef/vat-recording/individual/:id/cancel
   */
  static async cancelIndividualVatRecording(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const individualVatId = parseInt(req.params.id);
      if (isNaN(individualVatId)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      await sefService.cancelIndividualVatRecording(individualVatId);
      res.json({ success: true, message: 'Individual VAT recording cancelled' });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  // =====================================================
  // EPP ENDPOINTS (Evidencija Prethodnog Poreza)
  // =====================================================

  /**
   * POST /api/sef/vat-deduction
   */
  static async createVatDeductionRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = vatDeductionSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, errors: validation.error.errors });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const result = await sefService.createVatDeductionRecord(validation.data);
      res.json({ success: true, data: result });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/vat-deduction/:id
   */
  static async getVatDeductionRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const record = await sefService.getVatDeductionRecord(id);
      res.json({ success: true, data: record });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * PUT /api/sef/vat-deduction/:id
   */
  static async correctVatDeductionRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }

      const validation = vatDeductionSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, errors: validation.error.errors });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const result = await sefService.correctVatDeductionRecord(id, validation.data);
      res.json({ success: true, data: result });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * DELETE /api/sef/vat-deduction/:id
   */
  static async deleteVatDeductionRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      await sefService.deleteVatDeductionRecord(id);
      res.json({ success: true, message: 'VAT deduction record deleted' });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/vat-deduction/system-calculation
   */
  static async getSystemVatCalculation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { TaxId, Year, VatPeriodRange, VatPeriod } = req.query;

      if (!TaxId || !Year || !VatPeriodRange || !VatPeriod) {
        res.status(400).json({ 
          success: false, 
          error: 'TaxId, Year, VatPeriodRange and VatPeriod are required' 
        });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const calculation = await sefService.getSystemVatCalculation({
        TaxId: TaxId as string,
        Year: parseInt(Year as string),
        VatPeriodRange: VatPeriodRange as SEFVatPeriodRange,
        VatPeriod: VatPeriod as SEFVatPeriod,
      });
      res.json({ success: true, data: calculation });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/vat-deduction/:id/analytics
   */
  static async getVatDeductionAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const analytics = await sefService.getVatDeductionRecordAnalytics(id);
      
      res.set('Content-Type', 'text/csv');
      res.send(analytics);
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  // =====================================================
  // COMPANY ENDPOINTS
  // =====================================================

  /**
   * GET /api/sef/company/check
   */
  static async checkCompanyExists(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vatNumber = req.query.vatNumber as string;
      if (!vatNumber) {
        res.status(400).json({ success: false, error: 'VAT number required' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const result = await sefService.checkCompanyExists(vatNumber);
      res.json({ success: true, data: result });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * POST /api/sef/company/refresh
   */
  static async refreshCompanyData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sefService = await getServiceForCompany(req.user!.companyId);
      await sefService.refreshCompanyData();
      res.json({ success: true, message: 'Company data refreshed' });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  // =====================================================
  // NOTIFICATION ENDPOINTS
  // =====================================================

  /**
   * POST /api/sef/notifications/subscribe
   */
  static async subscribeNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { notificationUrl, authKey } = req.body;
      if (!notificationUrl) {
        res.status(400).json({ success: false, error: 'Notification URL required' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      await sefService.subscribeNotifications(notificationUrl, authKey);
      res.json({ success: true, message: 'Subscribed to notifications' });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * DELETE /api/sef/notifications/unsubscribe
   */
  static async unsubscribeNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sefService = await getServiceForCompany(req.user!.companyId);
      await sefService.unsubscribeNotifications();
      res.json({ success: true, message: 'Unsubscribed from notifications' });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  // =====================================================
  // CIR ENDPOINTS (Central Invoice Registry)
  // =====================================================

  /**
   * POST /api/sef/cir/assign
   */
  static async assignToCir(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { invoiceId, factorVatNumber } = req.body;
      if (!invoiceId || !factorVatNumber) {
        res.status(400).json({ success: false, error: 'Invoice ID and factor VAT number required' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const result = await sefService.assignToCir(invoiceId, factorVatNumber);
      res.json({ success: true, data: result });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * POST /api/sef/cir/cancel-assign
   */
  static async cancelCirAssignment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { invoiceId } = req.body;
      if (!invoiceId) {
        res.status(400).json({ success: false, error: 'Invoice ID required' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      await sefService.cancelCirAssignment(invoiceId);
      res.json({ success: true, message: 'CIR assignment cancelled' });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/cir/history/:cirInvoiceId
   */
  static async getCirHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const cirInvoiceId = parseInt(req.params.cirInvoiceId);
      if (isNaN(cirInvoiceId)) {
        res.status(400).json({ success: false, error: 'Invalid CIR invoice ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const history = await sefService.getCirHistory(cirInvoiceId);
      res.json({ success: true, data: history });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  // =====================================================
  // CUSTOMS DECLARATIONS ENDPOINTS
  // =====================================================

  /**
   * GET /api/sef/customs-declarations
   */
  static async getCustomsDeclarations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status, dateFrom, dateTo } = req.query;

      const sefService = await getServiceForCompany(req.user!.companyId);
      const declarations = await sefService.getCustomsDeclarations({
        status: status as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
      });
      res.json({ success: true, data: declarations });
    } catch (error) {
      handleSEFError(error, res);
    }
  }

  /**
   * GET /api/sef/customs-declarations/:id
   */
  static async getCustomsDeclaration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }

      const sefService = await getServiceForCompany(req.user!.companyId);
      const declaration = await sefService.getCustomsDeclaration(id);
      res.json({ success: true, data: declaration });
    } catch (error) {
      handleSEFError(error, res);
    }
  }
}
