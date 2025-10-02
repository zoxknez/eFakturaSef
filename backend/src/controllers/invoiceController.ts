import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import UBLGenerator from '../services/ublGenerator';
import { createSEFClient } from '../services/sefApiClient';

const prisma = new PrismaClient();
const ublGenerator = new UBLGenerator();

// Validation schemas
const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  issueDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid issue date'),
  dueDate: z.string().optional().refine(date => !date || !isNaN(Date.parse(date)), 'Invalid due date'),
  direction: z.enum(['OUTGOING', 'INCOMING']),
  documentType: z.enum(['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE']).default('INVOICE'),
  buyerId: z.string().uuid('Invalid buyer ID'),
  currency: z.string().default('RSD'),
  note: z.string().optional(),
  
  lines: z.array(z.object({
    itemName: z.string().min(1, 'Item name is required'),
    itemDescription: z.string().optional(),
    quantity: z.number().positive('Quantity must be positive'),
    unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
    unitPrice: z.number().positive('Unit price must be positive'),
    vatRate: z.number().min(0).max(100, 'VAT rate must be between 0 and 100'),
    vatCategory: z.enum(['STANDARD', 'ZERO_RATED', 'EXEMPT', 'REVERSE_CHARGE', 'NOT_SUBJECT']).default('STANDARD')
  })).min(1, 'At least one invoice line is required')
});

const updateInvoiceSchema = createInvoiceSchema.partial();

/**
 * Get all invoices for authenticated user's company
 */
export const getInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      direction, 
      status, 
      dateFrom, 
      dateTo,
      search 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      OR: [
        { supplierId: req.user!.companyId },
        { buyerId: req.user!.companyId }
      ]
    };

    if (direction) where.direction = direction;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) where.issueDate.gte = new Date(dateFrom as string);
      if (dateTo) where.issueDate.lte = new Date(dateTo as string);
    }
    if (search) {
      where.OR = [
        ...where.OR,
        { invoiceNumber: { contains: search as string } },
        { supplier: { name: { contains: search as string } } },
        { buyer: { name: { contains: search as string } } }
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true, pib: true }
          },
          buyer: {
            select: { id: true, name: true, pib: true }
          },
          lines: {
            select: {
              id: true,
              lineNumber: true,
              itemName: true,
              quantity: true,
              unitPrice: true,
              lineTotal: true,
              vatAmount: true,
              lineTotalWithVat: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.invoice.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        invoices: invoices.map(invoice => ({
          ...invoice,
          subtotal: Number(invoice.subtotal),
          totalVat: Number(invoice.totalVat),
          totalAmount: Number(invoice.totalAmount),
          lines: invoice.lines.map(line => ({
            ...line,
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice),
            lineTotal: Number(line.lineTotal),
            vatAmount: Number(line.vatAmount),
            lineTotalWithVat: Number(line.lineTotalWithVat)
          }))
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get single invoice by ID
 */
export const getInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        OR: [
          { supplierId: req.user!.companyId },
          { buyerId: req.user!.companyId }
        ]
      },
      include: {
        supplier: true,
        buyer: true,
        lines: {
          orderBy: { lineNumber: 'asc' }
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        ...invoice,
        subtotal: Number(invoice.subtotal),
        totalVat: Number(invoice.totalVat),
        totalAmount: Number(invoice.totalAmount),
        lines: invoice.lines.map(line => ({
          ...line,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          lineTotal: Number(line.lineTotal),
          vatRate: Number(line.vatRate),
          vatAmount: Number(line.vatAmount),
          lineTotalWithVat: Number(line.lineTotalWithVat)
        }))
      }
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Create new invoice
 */
export const createInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = createInvoiceSchema.parse(req.body);

    // Calculate line totals and invoice totals
    const lines = validatedData.lines.map((line, index) => {
      const lineTotal = line.quantity * line.unitPrice;
      const vatAmount = (lineTotal * line.vatRate) / 100;
      const lineTotalWithVat = lineTotal + vatAmount;

      return {
        ...line,
        lineNumber: index + 1,
        lineTotal,
        vatAmount,
        lineTotalWithVat
      };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const totalVat = lines.reduce((sum, line) => sum + line.vatAmount, 0);
    const totalAmount = subtotal + totalVat;

    // Verify buyer exists
    const buyer = await prisma.company.findUnique({
      where: { id: validatedData.buyerId }
    });

    if (!buyer) {
      res.status(400).json({
        success: false,
        message: 'Buyer company not found'
      });
      return;
    }

    // Create invoice with lines
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: validatedData.invoiceNumber,
        issueDate: new Date(validatedData.issueDate),
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        direction: validatedData.direction,
        status: 'DRAFT',
        documentType: validatedData.documentType,
        supplierId: req.user!.companyId,
        buyerId: validatedData.buyerId,
        subtotal,
        totalVat,
        totalAmount,
        currency: validatedData.currency,
        note: validatedData.note,
        lines: {
          create: lines
        }
      },
      include: {
        supplier: true,
        buyer: true,
        lines: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'invoice',
        entityId: invoice.id,
        action: 'CREATED',
        newData: JSON.stringify({ invoiceNumber: invoice.invoiceNumber }),
        userId: req.user!.userId
      }
    });

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: {
        ...invoice,
        subtotal: Number(invoice.subtotal),
        totalVat: Number(invoice.totalVat),
        totalAmount: Number(invoice.totalAmount),
        lines: invoice.lines.map(line => ({
          ...line,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          lineTotal: Number(line.lineTotal),
          vatRate: Number(line.vatRate),
          vatAmount: Number(line.vatAmount),
          lineTotalWithVat: Number(line.lineTotalWithVat)
        }))
      }
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update invoice (only if in DRAFT status)
 */
export const updateInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validatedData = updateInvoiceSchema.parse(req.body);

    // Check if invoice exists and belongs to user's company
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        supplierId: req.user!.companyId // Only supplier can edit
      }
    });

    if (!existingInvoice) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
      return;
    }

    if (existingInvoice.status !== 'DRAFT') {
      res.status(400).json({
        success: false,
        message: 'Only draft invoices can be edited'
      });
      return;
    }

    // Calculate totals if lines are provided
    let calculatedData: any = { ...validatedData };
    
    if (validatedData.lines) {
      const lines = validatedData.lines.map((line, index) => {
        const lineTotal = line.quantity! * line.unitPrice!;
        const vatAmount = (lineTotal * line.vatRate!) / 100;
        const lineTotalWithVat = lineTotal + vatAmount;

        return {
          ...line,
          lineNumber: index + 1,
          lineTotal,
          vatAmount,
          lineTotalWithVat
        };
      });

      calculatedData.subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
      calculatedData.totalVat = lines.reduce((sum, line) => sum + line.vatAmount, 0);
      calculatedData.totalAmount = calculatedData.subtotal + calculatedData.totalVat;
    }

    // Update invoice
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      // Delete existing lines if new lines provided
      if (validatedData.lines) {
        await tx.invoiceLine.deleteMany({
          where: { invoiceId: id }
        });
      }

      return tx.invoice.update({
        where: { id },
        data: {
          ...calculatedData,
          issueDate: calculatedData.issueDate ? new Date(calculatedData.issueDate) : undefined,
          dueDate: calculatedData.dueDate ? new Date(calculatedData.dueDate) : undefined,
          updatedAt: new Date(),
          ...(validatedData.lines && {
            lines: {
              create: calculatedData.lines
            }
          })
        },
        include: {
          supplier: true,
          buyer: true,
          lines: true
        }
      });
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'invoice',
        entityId: id,
        action: 'UPDATED',
        newData: JSON.stringify(validatedData),
        userId: req.user!.userId
      }
    });

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: {
        ...updatedInvoice,
        subtotal: Number(updatedInvoice.subtotal),
        totalVat: Number(updatedInvoice.totalVat),
        totalAmount: Number(updatedInvoice.totalAmount),
        lines: updatedInvoice.lines.map(line => ({
          ...line,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          lineTotal: Number(line.lineTotal),
          vatRate: Number(line.vatRate),
          vatAmount: Number(line.vatAmount),
          lineTotalWithVat: Number(line.lineTotalWithVat)
        }))
      }
    });

  } catch (error) {
    console.error('Update invoice error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Delete invoice (only if in DRAFT status)
 */
export const deleteInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        supplierId: req.user!.companyId
      }
    });

    if (!existingInvoice) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
      return;
    }

    if (existingInvoice.status !== 'DRAFT') {
      res.status(400).json({
        success: false,
        message: 'Only draft invoices can be deleted'
      });
      return;
    }

    await prisma.invoice.delete({
      where: { id }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'invoice',
        entityId: id,
        action: 'DELETED',
        oldData: JSON.stringify({ invoiceNumber: existingInvoice.invoiceNumber }),
        userId: req.user!.userId
      }
    });

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });

  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Send invoice to SEF system
 */
export const sendToSEF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        supplierId: req.user!.companyId,
        direction: 'OUTGOING'
      }
    });

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Outgoing invoice not found'
      });
      return;
    }

    if (invoice.status !== 'DRAFT') {
      res.status(400).json({
        success: false,
        message: 'Only draft invoices can be sent to SEF'
      });
      return;
    }

    // Generate UBL XML
    const ublXml = await ublGenerator.generateInvoiceXML(id);
    
    // Validate UBL
    const validation = await ublGenerator.validateUBL(ublXml);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: 'UBL validation failed',
        errors: validation.errors
      });
      return;
    }

    // Get SEF client
    const sefClient = await createSEFClient(req.user!.companyId);
    
    // Send to SEF
    const sefResponse = await sefClient.sendInvoice({
      invoiceXML: ublXml,
      companyPIB: invoice.supplierId,
      documentType: invoice.documentType as 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE'
    });

    // Update invoice with SEF ID and status
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        sefId: sefResponse.sefId,
        status: 'SENT',
        ublXml,
        updatedAt: new Date()
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'invoice',
        entityId: id,
        action: 'SENT_TO_SEF',
        newData: JSON.stringify({ sefId: sefResponse.sefId }),
        userId: req.user!.userId
      }
    });

    res.json({
      success: true,
      message: 'Invoice sent to SEF successfully',
      data: {
        sefId: sefResponse.sefId,
        status: updatedInvoice.status,
        warnings: sefResponse.warnings
      }
    });

  } catch (error) {
    console.error('Send to SEF error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to send invoice to SEF: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
};

/**
 * Get invoice XML (UBL)
 */
export const getInvoiceXML = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        OR: [
          { supplierId: req.user!.companyId },
          { buyerId: req.user!.companyId }
        ]
      }
    });

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
      return;
    }

    let xml: string;
    
    if (invoice.ublXml) {
      xml = invoice.ublXml;
    } else {
      xml = await ublGenerator.generateInvoiceXML(id);
    }

    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.xml"`
    });
    
    res.send(xml);

  } catch (error) {
    console.error('Get invoice XML error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};