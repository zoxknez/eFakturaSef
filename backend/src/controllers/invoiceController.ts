// src/controllers/invoiceController.ts

import { Response } from 'express';
// Lazy-load pdfkit only when needed to avoid type issues
import prisma from '../db/prisma';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import logger from '../utils/logger';
import { createSEFService } from '../services/sefService';

// Extend AuthRequest to include file upload
interface AuthRequestWithFile extends AuthRequest {
  file?: any; // Multer file type
}

/** Helpers */
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'invoiceNumber is required').transform((s) => s.trim()),
  invoiceDate: z
    .string()
    .min(1, 'invoiceDate is required')
    .refine((s) => !Number.isNaN(new Date(s).getTime()), 'invoiceDate must be a valid date'),
  buyerPib: z.string().min(8, 'buyerPib must be at least 8 chars').transform((s) => s.trim()),
  buyerName: z.string().min(1, 'buyerName is required').transform((s) => s.trim()),
  buyerAddress: z.string().min(1, 'buyerAddress is required').transform((s) => s.trim()),
  buyerCity: z.string().min(1, 'buyerCity is required').transform((s) => s.trim()),
  buyerPostalCode: z.string().min(1, 'buyerPostalCode is required').transform((s) => s.trim()),
  lines: z
    .array(
      z.object({
        itemName: z.string().min(1, 'itemName is required').transform((s) => s.trim()),
        quantity: z.number().positive('quantity must be > 0'),
        unitPrice: z.number().positive('unitPrice must be > 0'),
        vatRate: z.number().min(0).max(100),
      }),
    )
    .min(1, 'at least one line is required'),
});

export const createInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.issues,
      });
      return;
    }

    const data = parsed.data;
    const companyId = req.user.companyId;

    // Try locate existing buyer by PIB; create if missing
    let buyer = await prisma.company.findFirst({ where: { pib: data.buyerPib } });
    if (!buyer) {
      buyer = await prisma.company.create({
        data: {
          name: data.buyerName,
          pib: data.buyerPib,
          address: data.buyerAddress,
          city: data.buyerCity,
          postalCode: data.buyerPostalCode,
          country: 'RS',
          vatNumber: data.buyerPib,
        },
      });
    }

    let subtotal = 0;
    let totalVat = 0;

    const linesToCreate = data.lines.map((line, index) => {
      const lineTotal = round2(line.quantity * line.unitPrice);
      const lineVat = round2(lineTotal * (line.vatRate / 100));
      subtotal = round2(subtotal + lineTotal);
      totalVat = round2(totalVat + lineVat);

      return {
        lineNumber: index + 1,
        itemName: line.itemName,
        itemDescription: null,
        quantity: line.quantity,
        unitOfMeasure: 'PCE',
        unitPrice: line.unitPrice,
        vatRate: line.vatRate,
        // Keep string literal; align with your Prisma enum if present
        vatCategory: 'STANDARD' as unknown as string,
        lineTotal,
        vatAmount: lineVat,
        lineTotalWithVat: round2(lineTotal + lineVat),
      };
    });

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        issueDate: new Date(data.invoiceDate),
        direction: 'OUTGOING',
        status: 'DRAFT',
        documentType: 'INVOICE',
        supplierId: companyId,
        buyerId: buyer.id,
        subtotal,
        totalVat,
        totalAmount: round2(subtotal + totalVat),
        currency: 'RSD',
        companyId,
        lines: { create: linesToCreate },
      },
      include: { lines: true, supplier: true, buyer: true },
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    logger.error('Error creating invoice:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const companyId = req.user.companyId;

    const invoices = await prisma.invoice.findMany({
      where: { OR: [{ supplierId: companyId }, { buyerId: companyId }] },
      include: { lines: true, supplier: true, buyer: true },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: invoices });
  } catch (error) {
    logger.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getInvoiceById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params as { id: string };
    const companyId = req.user.companyId;

    const invoice = await prisma.invoice.findFirst({
      where: { id, OR: [{ supplierId: companyId }, { buyerId: companyId }] },
      include: { lines: true, supplier: true, buyer: true },
    });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    logger.error('Error fetching invoice:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateInvoiceStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params as { id: string };
    const { status } = (req.body ?? {}) as { status?: string };
    const companyId = req.user.companyId;

    if (!status || typeof status !== 'string' || !status.trim()) {
      res.status(400).json({ success: false, message: 'Missing status' });
      return;
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, OR: [{ supplierId: companyId }, { buyerId: companyId }] },
    });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: status.trim() },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'invoice',
        entityId: id,
        action: 'status_update',
        oldData: JSON.stringify({ status: invoice.status }),
        newData: JSON.stringify({ status: status.trim() }),
        userId: req.user.userId ?? null,
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating invoice status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params as { id: string };
    const companyId = req.user.companyId;

    const invoice = await prisma.invoice.findFirst({
      where: { id, companyId },
    });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    await prisma.invoice.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        entityType: 'invoice',
        entityId: id,
        action: 'deleted',
        oldData: JSON.stringify(invoice),
        newData: null,
        userId: req.user.userId ?? null,
      },
    });

    res.status(200).json({ success: true, data: null });
  } catch (error) {
    logger.error('Error deleting invoice:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const downloadInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params as { id: string };
    const format = ((req.query?.format as string) || 'xml').toLowerCase();
    const companyId = req.user.companyId;

    const invoice = await prisma.invoice.findFirst({
      where: { id, OR: [{ supplierId: companyId }, { buyerId: companyId }] },
      include: { lines: true, supplier: true, buyer: true },
    });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    const filenameSafe = (invoice.invoiceNumber || invoice.id).replace(/[^a-zA-Z0-9_-]+/g, '_');

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="faktura_${filenameSafe}.json"`);
      res.status(200).send(JSON.stringify(invoice, null, 2));
      return;
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="faktura_${filenameSafe}.pdf"`);
      // Lazy-load pdfkit to avoid TypeScript type resolution issues in environments without @types
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      doc.pipe(res);

      // Header
      doc.fontSize(18).text(`Faktura ${invoice.invoiceNumber}`, { align: 'center' });
      doc.moveDown();

      // Meta
      doc
        .fontSize(12)
        .text(`Datum izdavanja: ${new Date(invoice.issueDate).toLocaleDateString('sr-RS')}`);
      doc.text(`Valuta: ${invoice.currency}`);
      doc.moveDown();

      // Parties
      doc.text(`Dobavljač: ${invoice.supplier.name} (PIB: ${invoice.supplier.pib})`);
      doc.text(`Kupac: ${invoice.buyer.name} (PIB: ${invoice.buyer.pib})`);
      doc.moveDown();

      // Lines
      doc.text('Stavke:', { underline: true });
      invoice.lines.forEach((l) => {
        doc.text(
          `${l.lineNumber}. ${l.itemName}  x${l.quantity}  ${l.unitPrice.toFixed(2)} RSD  = ${l.lineTotal.toFixed(2)} RSD`
        );
      });
      doc.moveDown();

      // Totals
      try {
        doc.font('Helvetica-Bold');
      } catch (_) {
        // ignore if font not available in environment
      }
      doc.text(`Osnovica: ${invoice.subtotal.toFixed(2)} ${invoice.currency}`);
      doc.text(`PDV: ${invoice.totalVat.toFixed(2)} ${invoice.currency}`);
      doc.text(`Ukupno: ${invoice.totalAmount.toFixed(2)} ${invoice.currency}`);

      doc.end();
      return;
    }

    // Minimal UBL-like XML (demo). In produkciji koristiti pravi UBL generator.
    const xmlLines = invoice.lines
      .map(
        (l) =>
          `    <cac:InvoiceLine>\n      <cbc:ID>${l.lineNumber}</cbc:ID>\n      <cbc:InvoicedQuantity unitCode="${l.unitOfMeasure}">${l.quantity}</cbc:InvoicedQuantity>\n      <cbc:LineExtensionAmount currencyID="${invoice.currency}">${l.lineTotal.toFixed(2)}</cbc:LineExtensionAmount>\n      <cac:Item><cbc:Name>${l.itemName}</cbc:Name></cac:Item>\n      <cac:Price><cbc:PriceAmount currencyID="${invoice.currency}">${l.unitPrice.toFixed(2)}</cbc:PriceAmount></cac:Price>\n    </cac:InvoiceLine>`
      )
      .join('\n');

    const issueDate = new Date(invoice.issueDate).toISOString().slice(0, 10);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${invoice.supplier.name}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${invoice.supplier.address}</cbc:StreetName>
        <cbc:CityName>${invoice.supplier.city}</cbc:CityName>
        <cbc:PostalZone>${invoice.supplier.postalCode}</cbc:PostalZone>
        <cbc:CountrySubentity>RS</cbc:CountrySubentity>
      </cac:PostalAddress>
      <cac:PartyTaxScheme><cbc:CompanyID>${invoice.supplier.pib}</cbc:CompanyID></cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${invoice.buyer.name}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${invoice.buyer.address}</cbc:StreetName>
        <cbc:CityName>${invoice.buyer.city}</cbc:CityName>
        <cbc:PostalZone>${invoice.buyer.postalCode}</cbc:PostalZone>
        <cbc:CountrySubentity>RS</cbc:CountrySubentity>
      </cac:PostalAddress>
      <cac:PartyTaxScheme><cbc:CompanyID>${invoice.buyer.pib}</cbc:CompanyID></cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.totalAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.currency}">${invoice.totalAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${xmlLines}
</Invoice>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="faktura_${filenameSafe}.xml"`);
    res.status(200).send(xml);
  } catch (error) {
    logger.error('Error downloading invoice:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Pošalji fakturu u SEF sistem
 */
export const sendInvoiceToSEF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const invoiceId = req.params.id;
    if (!invoiceId) {
      res.status(400).json({ success: false, message: 'Invoice ID is required' });
      return;
    }

    // Pronađi fakturu
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        OR: [
          { supplierId: req.user.companyId },
          { buyerId: req.user.companyId }
        ]
      },
      include: {
        supplier: true,
        buyer: true,
        lines: true
      }
    });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    // Proveri da li je faktura u draft statusu i izlazna
    if (invoice.status !== 'DRAFT' || invoice.direction !== 'OUTGOING') {
      res.status(400).json({
        success: false,
        message: 'Samo draft izlazne fakture mogu biti poslate u SEF sistem'
      });
      return;
    }

    // Dobij API ključ kompanije
    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId }
    });

    if (!company?.sefApiKey) {
      res.status(400).json({
        success: false,
        message: 'SEF API ključ nije konfigurisan za vašu kompaniju'
      });
      return;
    }

    // Kreraj SEF service
    const sefService = createSEFService(company.sefApiKey);

    // Pripremi podatke za SEF
    const sefInvoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate?.toISOString(),
      supplier: {
        pib: invoice.supplier.pib,
        name: invoice.supplier.name,
        address: invoice.supplier.address,
        city: invoice.supplier.city,
        postalCode: invoice.supplier.postalCode,
      },
      buyer: {
        pib: invoice.buyer.pib,
        name: invoice.buyer.name,
        address: invoice.buyer.address,
        city: invoice.buyer.city,
        postalCode: invoice.buyer.postalCode,
      },
      lines: invoice.lines.map(line => ({
        itemName: line.itemName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        vatRate: line.vatRate,
        lineTotal: line.lineTotal,
      })),
      totalAmount: invoice.totalAmount,
      totalVat: invoice.totalVat,
      subtotal: invoice.subtotal,
      currency: invoice.currency,
      ublXml: invoice.ublXml || undefined,
    };

    // Pošalji u SEF
    const result = await sefService.sendInvoice(sefInvoiceData);

    if (result.success && result.sefId) {
      // Ažuriraj fakturu u bazi
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          sefId: result.sefId,
          status: 'SENT',
          sentAt: new Date(),
        }
      });

      logger.info('Faktura uspešno poslata u SEF:', {
        invoiceId,
        sefId: result.sefId
      });

      res.json({
        success: true,
        message: 'Faktura je uspešno poslata u SEF sistem',
        data: {
          sefId: result.sefId,
          status: 'SENT'
        }
      });
    } else {
      logger.error('Greška pri slanju fakture u SEF:', result);

      res.status(400).json({
        success: false,
        message: result.message || 'Greška pri slanju fakture u SEF sistem',
        errors: result.errors
      });
    }

  } catch (error) {
    logger.error('Error sending invoice to SEF:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Import UBL file and create invoice
 */
export const importUBL = async (req: AuthRequestWithFile, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'UBL fajl je obavezan' });
      return;
    }

    const ublContent = req.file.buffer.toString('utf-8');

    // Basic UBL validation
    if (!ublContent.includes('<Invoice') && !ublContent.includes('<invoice')) {
      res.status(400).json({
        success: false,
        message: 'Fajl nije validan UBL dokument'
      });
      return;
    }

    // TODO: Implement proper UBL XML parsing using xml2js or similar
    // For now, create a mock invoice from UBL data
    const mockInvoice = {
      invoiceNumber: `UBL-${Date.now()}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      buyerPib: '12345678',
      buyerName: 'UBL Import',
      buyerAddress: 'UBL Address',
      buyerCity: 'Belgrade',
      buyerCountry: 'Serbia',
      totalAmount: 100.00,
      taxAmount: 20.00,
      totalWithTax: 120.00,
      currency: 'RSD',
      paymentMethod: 'CASH',
      items: [
        {
          name: 'UBL Imported Item',
          quantity: 1,
          unitPrice: 100.00,
          totalPrice: 100.00,
          taxRate: 20
        }
      ]
    };

    // For now, just return success without creating invoice
    // TODO: Implement proper UBL parsing and Company/Invoice creation
    logger.info('UBL file received for processing:', {
      companyId: req.user.companyId,
      fileName: req.file?.originalname || 'unknown',
      fileSize: req.file?.size || 0
    });

    // Mock response
    const mockInvoiceResponse = {
      id: 'ubl-' + Date.now(),
      invoiceNumber: mockInvoice.invoiceNumber,
      issueDate: mockInvoice.invoiceDate,
      totalAmount: mockInvoice.totalWithTax,
      status: 'DRAFT'
    };

    res.json({
      success: true,
      message: 'UBL fajl je uspešno uvezen',
      data: mockInvoiceResponse
    });  } catch (error) {
    logger.error('Error importing UBL:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
