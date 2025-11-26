/**
 * Import Controller
 * Handles bulk import of various data types from CSV/Excel files
 */

import { Request, Response } from 'express';
import { PrismaClient, Prisma, InvoicePaymentStatus, PartnerType, BankStatementStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { getErrorMessage } from '../types/common';

const prisma = new PrismaClient();

interface ImportError {
  row: number;
  field?: string;
  message: string;
}

interface ImportResult {
  total: number;
  imported: number;
  failed: number;
  errors: ImportError[];
}

// Validation helpers
const validateRequired = (value: unknown, fieldName: string, row: number, errors: ImportError[]): boolean => {
  if (value === undefined || value === null || value === '') {
    errors.push({ row, field: fieldName, message: `Obavezno polje "${fieldName}" nije popunjeno` });
    return false;
  }
  return true;
};

const validatePIB = (pib: string, row: number, errors: ImportError[]): boolean => {
  if (!pib) return true;
  const cleanPib = pib.replace(/\D/g, '');
  if (cleanPib.length !== 9) {
    errors.push({ row, field: 'pib', message: `PIB mora imati tačno 9 cifara` });
    return false;
  }
  return true;
};

const validateNumber = (value: string, fieldName: string, row: number, errors: ImportError[]): number | null => {
  if (!value) return null;
  const num = parseFloat(value.replace(',', '.').replace(/[^\d.-]/g, ''));
  if (isNaN(num)) {
    errors.push({ row, field: fieldName, message: `"${value}" nije validan broj` });
    return null;
  }
  return num;
};

const parseDate = (value: string): Date | null => {
  if (!value) return null;
  
  // Try ISO format YYYY-MM-DD
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
    const date = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try DD.MM.YYYY format
  const euMatch = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (euMatch && euMatch[1] && euMatch[2] && euMatch[3]) {
    const date = new Date(parseInt(euMatch[3], 10), parseInt(euMatch[2], 10) - 1, parseInt(euMatch[1], 10));
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
};

const validateDate = (value: string, fieldName: string, row: number, errors: ImportError[]): Date | null => {
  const date = parseDate(value);
  if (!date && value) {
    errors.push({ row, field: fieldName, message: `"${value}" nije validan datum` });
  }
  return date;
};

/**
 * Import Partners
 */
export const importPartners = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const companyId = authReq.user?.companyId;
  const userId = authReq.user?.id;
  
  try {
    const { data } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ success: false, error: 'Podaci nisu prosleđeni' });
    }
    
    const result: ImportResult = { total: data.length, imported: 0, failed: 0, errors: [] };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;
      const rowErrors: ImportError[] = [];
      
      const nameValid = validateRequired(row.name, 'name', rowNum, rowErrors);
      const pibValid = validateRequired(row.pib, 'pib', rowNum, rowErrors);
      
      if (nameValid && pibValid) validatePIB(row.pib, rowNum, rowErrors);
      
      if (rowErrors.length > 0) {
        result.errors.push(...rowErrors);
        result.failed++;
        continue;
      }
      
      try {
        const cleanPib = row.pib.replace(/\D/g, '');
        const existing = await prisma.partner.findFirst({ where: { companyId, pib: cleanPib } });
        
        if (existing) {
          await prisma.partner.update({ 
            where: { id: existing.id }, 
            data: {
              name: row.name.trim(),
              pib: cleanPib,
              address: row.address?.trim() || '',
              city: row.city?.trim() || '',
              postalCode: row.postalCode?.trim() || '',
              email: row.email?.toLowerCase().trim() || null,
              phone: row.phone?.trim() || null,
              type: row.type === 'SUPPLIER' ? PartnerType.SUPPLIER : 
                    row.type === 'BOTH' ? PartnerType.BOTH : PartnerType.BUYER,
            }
          });
        } else {
          await prisma.partner.create({ 
            data: {
              name: row.name.trim(),
              pib: cleanPib,
              address: row.address?.trim() || '',
              city: row.city?.trim() || '',
              postalCode: row.postalCode?.trim() || '',
              email: row.email?.toLowerCase().trim() || null,
              phone: row.phone?.trim() || null,
              type: row.type === 'SUPPLIER' ? PartnerType.SUPPLIER : 
                    row.type === 'BOTH' ? PartnerType.BOTH : PartnerType.BUYER,
              company: { connect: { id: companyId } }
            }
          });
        }
        result.imported++;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        result.errors.push({ row: rowNum, message: errorMessage });
        result.failed++;
      }
    }
    
    logger.info('Partners import', { userId, companyId, result });
    return res.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Partners import error', error);
    return res.status(500).json({ success: false, error: errorMessage });
  }
};

/**
 * Import Products
 */
export const importProducts = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const companyId = authReq.user?.companyId;
  const userId = authReq.user?.id;
  
  try {
    const { data } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ success: false, error: 'Podaci nisu prosleđeni' });
    }
    
    const result: ImportResult = { total: data.length, imported: 0, failed: 0, errors: [] };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;
      const rowErrors: ImportError[] = [];
      
      validateRequired(row.code, 'code', rowNum, rowErrors);
      validateRequired(row.name, 'name', rowNum, rowErrors);
      validateRequired(row.unit, 'unit', rowNum, rowErrors);
      validateRequired(row.price, 'price', rowNum, rowErrors);
      
      const price = validateNumber(row.price, 'price', rowNum, rowErrors);
      
      if (rowErrors.length > 0 || price === null) {
        result.errors.push(...rowErrors);
        result.failed++;
        continue;
      }
      
      try {
        const existing = await prisma.product.findFirst({ where: { companyId, code: row.code.trim() } });
        
        if (existing) {
          await prisma.product.update({ 
            where: { id: existing.id }, 
            data: {
              code: row.code.trim(),
              name: row.name.trim(),
              description: row.description?.trim() || null,
              unit: row.unit.trim(),
              unitPrice: new Prisma.Decimal(price),
              vatRate: row.vatRate ? parseFloat(row.vatRate) : 20,
              category: row.category?.trim() || null,
            }
          });
        } else {
          await prisma.product.create({ 
            data: {
              code: row.code.trim(),
              name: row.name.trim(),
              description: row.description?.trim() || null,
              unit: row.unit.trim(),
              unitPrice: new Prisma.Decimal(price),
              vatRate: row.vatRate ? parseFloat(row.vatRate) : 20,
              category: row.category?.trim() || null,
              company: { connect: { id: companyId } }
            }
          });
        }
        result.imported++;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        result.errors.push({ row: rowNum, message: errorMessage });
        result.failed++;
      }
    }
    
    logger.info('Products import', { userId, companyId, result });
    return res.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Products import error', error);
    return res.status(500).json({ success: false, error: errorMessage });
  }
};

/**
 * Import Invoices
 */
export const importInvoices = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const companyId = authReq.user?.companyId;
  const userId = authReq.user?.id;
  
  try {
    const { data } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ success: false, error: 'Podaci nisu prosleđeni' });
    }
    
    const result: ImportResult = { total: data.length, imported: 0, failed: 0, errors: [] };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;
      const rowErrors: ImportError[] = [];
      
      validateRequired(row.invoiceNumber, 'invoiceNumber', rowNum, rowErrors);
      validateRequired(row.issueDate, 'issueDate', rowNum, rowErrors);
      validateRequired(row.buyerName, 'buyerName', rowNum, rowErrors);
      validateRequired(row.buyerPIB, 'buyerPIB', rowNum, rowErrors);
      validateRequired(row.totalAmount, 'totalAmount', rowNum, rowErrors);
      
      const issueDate = validateDate(row.issueDate, 'issueDate', rowNum, rowErrors);
      const dueDate = row.dueDate ? validateDate(row.dueDate, 'dueDate', rowNum, rowErrors) : null;
      const totalAmount = validateNumber(row.totalAmount, 'totalAmount', rowNum, rowErrors);
      const taxAmount = row.taxAmount ? validateNumber(row.taxAmount, 'taxAmount', rowNum, rowErrors) : 0;
      
      if (row.buyerPIB) validatePIB(row.buyerPIB, rowNum, rowErrors);
      
      if (rowErrors.length > 0 || !issueDate || totalAmount === null) {
        result.errors.push(...rowErrors);
        result.failed++;
        continue;
      }
      
      try {
        const existing = await prisma.invoice.findFirst({
          where: { companyId, invoiceNumber: row.invoiceNumber.trim() }
        });
        
        if (existing) {
          result.errors.push({ row: rowNum, message: `Faktura ${row.invoiceNumber} već postoji` });
          result.failed++;
          continue;
        }
        
        const cleanPib = row.buyerPIB.replace(/\D/g, '');
        let partner = await prisma.partner.findFirst({ where: { companyId, pib: cleanPib } });
        
        if (!partner) {
          partner = await prisma.partner.create({
            data: { 
              name: row.buyerName.trim(), 
              pib: cleanPib, 
              type: PartnerType.BUYER,
              address: '',
              city: '',
              postalCode: '',
              company: { connect: { id: companyId } }
            }
          });
        }
        
        await prisma.invoice.create({
          data: {
            invoiceNumber: row.invoiceNumber.trim(),
            issueDate,
            dueDate,
            buyerName: row.buyerName.trim(),
            buyerPIB: cleanPib,
            partner: { connect: { id: partner.id } },
            totalAmount: new Prisma.Decimal(totalAmount),
            taxAmount: new Prisma.Decimal(taxAmount || 0),
            currency: row.currency?.toUpperCase() || 'RSD',
            status: 'DRAFT',
            type: 'OUTGOING',
            company: { connect: { id: companyId } },
          }
        });
        result.imported++;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        result.errors.push({ row: rowNum, message: errorMessage });
        result.failed++;
      }
    }
    
    logger.info('Invoices import', { userId, companyId, result });
    return res.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Invoices import error', error);
    return res.status(500).json({ success: false, error: errorMessage });
  }
};

/**
 * Import Payments
 */
export const importPayments = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const companyId = authReq.user?.companyId;
  const userId = authReq.user?.id;
  
  try {
    const { data } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ success: false, error: 'Podaci nisu prosleđeni' });
    }
    
    const result: ImportResult = { total: data.length, imported: 0, failed: 0, errors: [] };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;
      const rowErrors: ImportError[] = [];
      
      validateRequired(row.invoiceNumber, 'invoiceNumber', rowNum, rowErrors);
      validateRequired(row.paymentDate, 'paymentDate', rowNum, rowErrors);
      validateRequired(row.amount, 'amount', rowNum, rowErrors);
      
      const paymentDate = validateDate(row.paymentDate, 'paymentDate', rowNum, rowErrors);
      const amount = validateNumber(row.amount, 'amount', rowNum, rowErrors);
      
      if (rowErrors.length > 0 || !paymentDate || amount === null) {
        result.errors.push(...rowErrors);
        result.failed++;
        continue;
      }
      
      try {
        const invoice = await prisma.invoice.findFirst({
          where: { companyId, invoiceNumber: row.invoiceNumber.trim() }
        });
        
        if (!invoice) {
          result.errors.push({ row: rowNum, message: `Faktura ${row.invoiceNumber} nije pronađena` });
          result.failed++;
          continue;
        }
        
        await prisma.payment.create({
          data: {
            invoice: { connect: { id: invoice.id } },
            paymentDate,
            amount: new Prisma.Decimal(amount),
            method: 'BANK_TRANSFER',
            reference: row.reference?.trim() || null,
            createdBy: userId || ''
          }
        });
        
        // Update invoice payment status
        const totalPaid = await prisma.payment.aggregate({
          where: { invoiceId: invoice.id },
          _sum: { amount: true }
        });
        
        const paidAmount = totalPaid._sum.amount || new Prisma.Decimal(0);
        let paymentStatus: InvoicePaymentStatus = 'UNPAID';
        
        if (paidAmount.gte(invoice.totalAmount)) {
          paymentStatus = 'PAID';
        } else if (paidAmount.gt(new Prisma.Decimal(0))) {
          paymentStatus = 'PARTIALLY_PAID';
        }
        
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { paymentStatus }
        });
        
        result.imported++;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        result.errors.push({ row: rowNum, message: errorMessage });
        result.failed++;
      }
    }
    
    logger.info('Payments import', { userId, companyId, result });
    return res.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Payments import error', error);
    return res.status(500).json({ success: false, error: errorMessage });
  }
};

/**
 * Import Bank Statements
 */
export const importBankStatements = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const companyId = authReq.user?.companyId;
  const userId = authReq.user?.id;
  
  try {
    const { data } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ success: false, error: 'Podaci nisu prosleđeni' });
    }
    
    const result: ImportResult = { total: data.length, imported: 0, failed: 0, errors: [] };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;
      const rowErrors: ImportError[] = [];
      
      validateRequired(row.date, 'date', rowNum, rowErrors);
      validateRequired(row.description, 'description', rowNum, rowErrors);
      
      const transactionDate = validateDate(row.date, 'date', rowNum, rowErrors);
      const debit = row.debit ? validateNumber(row.debit, 'debit', rowNum, rowErrors) : null;
      const credit = row.credit ? validateNumber(row.credit, 'credit', rowNum, rowErrors) : null;
      
      if (rowErrors.length > 0 || !transactionDate) {
        result.errors.push(...rowErrors);
        result.failed++;
        continue;
      }
      
      if (!debit && !credit) {
        result.errors.push({ row: rowNum, message: 'Mora biti unet iznos' });
        result.failed++;
        continue;
      }
      
      try {
        await prisma.bankStatement.create({
          data: {
            statementNumber: `IMP-${Date.now()}-${i}`,
            accountNumber: row.accountNumber?.trim() || '000-0000000000000-00',
            statementDate: transactionDate,
            fromDate: transactionDate,
            toDate: transactionDate,
            totalDebit: debit ? new Prisma.Decimal(debit) : new Prisma.Decimal(0),
            totalCredit: credit ? new Prisma.Decimal(credit) : new Prisma.Decimal(0),
            openingBalance: new Prisma.Decimal(0),
            closingBalance: new Prisma.Decimal(0),
            status: BankStatementStatus.IMPORTED,
            company: { connect: { id: companyId } }
          }
        });
        result.imported++;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        result.errors.push({ row: rowNum, message: errorMessage });
        result.failed++;
      }
    }
    
    logger.info('Bank statements import', { userId, companyId, result });
    return res.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Bank statements import error', error);
    return res.status(500).json({ success: false, error: errorMessage });
  }
};
