import { PrismaClient, BankStatement, BankTransaction, Prisma, BankStatementStatus, BankTransactionType, MatchStatus, PaymentStatus, InvoiceStatus, InvoicePaymentStatus } from '@prisma/client';
import { AppError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import * as xml2js from 'xml2js';

const prisma = new PrismaClient();

// Interfaces for bank statement parsing
interface ParsedBankStatement {
  accountNumber: string;
  bankName: string;
  statementNumber: string;
  statementDate: Date;
  periodFrom: Date;
  periodTo: Date;
  openingBalance: number;
  closingBalance: number;
  currency: string;
  transactions: ParsedTransaction[];
}

interface ParsedTransaction {
  transactionDate: Date;
  valueDate: Date;
  reference: string;
  description: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  partnerName?: string;
  partnerAccount?: string;
}

// Serbian bank XML formats
interface NBSXMLFormat {
  IzvodBanke: {
    ZaglavljeIzvoda: Array<{
      BrojRacuna: string[];
      NazivBanke: string[];
      BrojIzvoda: string[];
      DatumIzvoda: string[];
      DatumOd: string[];
      DatumDo: string[];
      PocetnoStanje: string[];
      KrajnjeStanje: string[];
      Valuta: string[];
    }>;
    StavkeIzvoda: Array<{
      Stavka: Array<{
        DatumTransakcije: string[];
        DatumValute: string[];
        Poziv: string[];
        Opis: string[];
        Duguje: string[];
        Potrazuje: string[];
        NazivPartnera?: string[];
        RacunPartnera?: string[];
      }>;
    }>;
  };
}

export class BankStatementService {
  
  /**
   * Import bank statement from file
   */
  async importStatement(
    companyId: string,
    fileContent: string | Buffer,
    fileName: string,
    format: 'xml' | 'csv' | 'mt940' = 'xml'
  ): Promise<BankStatement> {
    try {
      let parsedStatement: ParsedBankStatement;
      
      switch (format) {
        case 'xml':
          parsedStatement = await this.parseXMLStatement(fileContent.toString());
          break;
        case 'csv':
          parsedStatement = await this.parseCSVStatement(fileContent.toString());
          break;
        case 'mt940':
          parsedStatement = await this.parseMT940Statement(fileContent.toString());
          break;
        default:
          throw new AppError('Unsupported format', 400, 'UNSUPPORTED_FORMAT');
      }
      
      // Check for duplicate
      const existing = await prisma.bankStatement.findFirst({
        where: {
          companyId,
          accountNumber: parsedStatement.accountNumber,
          statementNumber: parsedStatement.statementNumber,
        },
      });
      
      if (existing) {
        throw new AppError(
          `Izvod ${parsedStatement.statementNumber} za račun ${parsedStatement.accountNumber} već postoji`,
          409,
          'DUPLICATE_STATEMENT'
        );
      }
      
      // Calculate totals
      const totalDebit = parsedStatement.transactions
        .filter(t => t.type === 'DEBIT')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalCredit = parsedStatement.transactions
        .filter(t => t.type === 'CREDIT')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Create statement with transactions
      const statement = await prisma.bankStatement.create({
        data: {
          companyId,
          accountNumber: parsedStatement.accountNumber,
          bankName: parsedStatement.bankName,
          statementNumber: parsedStatement.statementNumber,
          statementDate: parsedStatement.statementDate,
          fromDate: parsedStatement.periodFrom,
          toDate: parsedStatement.periodTo,
          openingBalance: new Prisma.Decimal(parsedStatement.openingBalance),
          closingBalance: new Prisma.Decimal(parsedStatement.closingBalance),
          totalDebit: new Prisma.Decimal(totalDebit),
          totalCredit: new Prisma.Decimal(totalCredit),
          status: BankStatementStatus.IMPORTED,
          transactions: {
            create: parsedStatement.transactions.map((t) => ({
              transactionDate: t.transactionDate,
              valueDate: t.valueDate,
              amount: new Prisma.Decimal(t.amount),
              type: t.type === 'CREDIT' ? BankTransactionType.CREDIT : BankTransactionType.DEBIT,
              reference: t.reference || null,
              description: t.description || null,
              partnerName: t.partnerName || null,
              partnerAccount: t.partnerAccount || null,
              matchStatus: MatchStatus.UNMATCHED,
            })),
          },
        },
        include: {
          transactions: true,
        },
      });
      
      logger.info(`Imported bank statement: ${statement.statementNumber}`, {
        companyId,
        transactionCount: statement.transactions.length,
      });
      
      return statement;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to import bank statement', { error, fileName });
      throw new AppError('Failed to import bank statement', 500, 'IMPORT_FAILED');
    }
  }
  
  /**
   * Parse Serbian XML bank statement format
   */
  private async parseXMLStatement(content: string): Promise<ParsedBankStatement> {
    const parser = new xml2js.Parser({ explicitArray: true });
    
    try {
      const result = await parser.parseStringPromise(content) as NBSXMLFormat;
      const header = result.IzvodBanke?.ZaglavljeIzvoda?.[0];
      const items = result.IzvodBanke?.StavkeIzvoda?.[0]?.Stavka || [];
      
      if (!header) {
        throw new AppError('Invalid XML format - missing header', 400, 'INVALID_FORMAT');
      }
      
      return {
        accountNumber: header.BrojRacuna?.[0] || '',
        bankName: header.NazivBanke?.[0] || '',
        statementNumber: header.BrojIzvoda?.[0] || '',
        statementDate: new Date(header.DatumIzvoda?.[0] || new Date()),
        periodFrom: new Date(header.DatumOd?.[0] || new Date()),
        periodTo: new Date(header.DatumDo?.[0] || new Date()),
        openingBalance: parseFloat(header.PocetnoStanje?.[0] || '0'),
        closingBalance: parseFloat(header.KrajnjeStanje?.[0] || '0'),
        currency: header.Valuta?.[0] || 'RSD',
        transactions: items.map(item => {
          const debit = parseFloat(item.Duguje?.[0] || '0');
          const credit = parseFloat(item.Potrazuje?.[0] || '0');
          return {
            transactionDate: new Date(item.DatumTransakcije?.[0] || new Date()),
            valueDate: new Date(item.DatumValute?.[0] || new Date()),
            reference: item.Poziv?.[0] || '',
            description: item.Opis?.[0] || '',
            amount: credit > 0 ? credit : debit,
            type: (credit > 0 ? 'CREDIT' : 'DEBIT') as 'CREDIT' | 'DEBIT',
            partnerName: item.NazivPartnera?.[0],
            partnerAccount: item.RacunPartnera?.[0],
          };
        }),
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to parse XML content', 400, 'PARSE_ERROR');
    }
  }
  
  /**
   * Parse CSV bank statement (generic format)
   */
  private async parseCSVStatement(content: string): Promise<ParsedBankStatement> {
    try {
      // Simple CSV parsing without external library
      const lines = content.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length < 2) {
        throw new AppError('Empty or invalid CSV file', 400, 'EMPTY_FILE');
      }
      
      const headerLine = lines[0];
      if (!headerLine) {
        throw new AppError('Invalid CSV header', 400, 'INVALID_FORMAT');
      }
      
      const headers = headerLine.split(';').map(h => h.trim().toLowerCase());
      const transactions: ParsedTransaction[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        
        const values = line.split(';').map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });
        
        const debit = this.parseAmount(row['duguje'] || row['debit'] || '0');
        const credit = this.parseAmount(row['potrazuje'] || row['credit'] || '0');
        
        transactions.push({
          transactionDate: this.parseDate(row['datum'] || row['date'] || ''),
          valueDate: this.parseDate(row['datumvalute'] || row['valuedate'] || row['datum'] || ''),
          reference: row['poziv'] || row['reference'] || '',
          description: row['opis'] || row['description'] || '',
          amount: credit > 0 ? credit : debit,
          type: credit > 0 ? 'CREDIT' : 'DEBIT',
          partnerName: row['partner'] || row['naziv'] || undefined,
          partnerAccount: row['racun'] || row['account'] || undefined,
        });
      }
      
      const totalDebit = transactions.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);
      const totalCredit = transactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
      
      return {
        accountNumber: 'CSV-IMPORT',
        bankName: 'CSV Import',
        statementNumber: `CSV-${Date.now()}`,
        statementDate: new Date(),
        periodFrom: transactions.length > 0 
          ? new Date(Math.min(...transactions.map(t => t.transactionDate.getTime())))
          : new Date(),
        periodTo: transactions.length > 0
          ? new Date(Math.max(...transactions.map(t => t.transactionDate.getTime())))
          : new Date(),
        openingBalance: 0,
        closingBalance: totalCredit - totalDebit,
        currency: 'RSD',
        transactions,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to parse CSV content', 400, 'PARSE_ERROR');
    }
  }
  
  /**
   * Parse MT940 SWIFT bank statement format
   */
  private async parseMT940Statement(content: string): Promise<ParsedBankStatement> {
    const lines = content.split('\n');
    let accountNumber = '';
    let statementNumber = '';
    let openingBalance = 0;
    let closingBalance = 0;
    let currency = 'RSD';
    const transactions: ParsedTransaction[] = [];
    
    let currentTransaction: Partial<ParsedTransaction> | null = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Account number (field 25)
      if (trimmedLine.startsWith(':25:')) {
        accountNumber = trimmedLine.substring(4);
      }
      
      // Statement number (field 28C)
      if (trimmedLine.startsWith(':28C:')) {
        statementNumber = trimmedLine.substring(5);
      }
      
      // Opening balance (field 60F or 60M)
      if (trimmedLine.startsWith(':60F:') || trimmedLine.startsWith(':60M:')) {
        const balanceStr = trimmedLine.substring(5);
        currency = balanceStr.substring(1, 4);
        const sign = balanceStr[0] === 'D' ? -1 : 1;
        openingBalance = sign * this.parseMT940Amount(balanceStr.substring(10));
      }
      
      // Closing balance (field 62F or 62M)
      if (trimmedLine.startsWith(':62F:') || trimmedLine.startsWith(':62M:')) {
        const balanceStr = trimmedLine.substring(5);
        const sign = balanceStr[0] === 'D' ? -1 : 1;
        closingBalance = sign * this.parseMT940Amount(balanceStr.substring(10));
      }
      
      // Transaction (field 61)
      if (trimmedLine.startsWith(':61:')) {
        if (currentTransaction && currentTransaction.transactionDate) {
          transactions.push(currentTransaction as ParsedTransaction);
        }
        
        const txStr = trimmedLine.substring(4);
        const dateStr = txStr.substring(0, 6);
        const year = 2000 + parseInt(dateStr.substring(0, 2));
        const month = parseInt(dateStr.substring(2, 4)) - 1;
        const day = parseInt(dateStr.substring(4, 6));
        
        const isDebit = txStr[10] === 'D';
        const amountMatch = txStr.match(/[DC](\d+[,.]?\d*)/);
        const amount = amountMatch && amountMatch[1] ? this.parseMT940Amount(amountMatch[1]) : 0;
        
        currentTransaction = {
          transactionDate: new Date(year, month, day),
          valueDate: new Date(year, month, day),
          reference: '',
          description: '',
          amount,
          type: isDebit ? 'DEBIT' : 'CREDIT',
        };
      }
      
      // Transaction details (field 86)
      if (trimmedLine.startsWith(':86:') && currentTransaction) {
        currentTransaction.description = trimmedLine.substring(4);
      }
    }
    
    if (currentTransaction && currentTransaction.transactionDate) {
      transactions.push(currentTransaction as ParsedTransaction);
    }
    
    return {
      accountNumber,
      bankName: 'MT940 Import',
      statementNumber: statementNumber || `MT940-${Date.now()}`,
      statementDate: new Date(),
      periodFrom: transactions.length > 0
        ? new Date(Math.min(...transactions.map(t => t.transactionDate.getTime())))
        : new Date(),
      periodTo: transactions.length > 0
        ? new Date(Math.max(...transactions.map(t => t.transactionDate.getTime())))
        : new Date(),
      openingBalance,
      closingBalance,
      currency,
      transactions,
    };
  }
  
  /**
   * Parse MT940 amount format
   */
  private parseMT940Amount(str: string): number {
    return parseFloat(str.replace(',', '.'));
  }
  
  /**
   * Parse date from various formats
   */
  private parseDate(str: string): Date {
    if (!str) return new Date();
    
    // Try ISO format first
    const isoDate = new Date(str);
    if (!isNaN(isoDate.getTime())) return isoDate;
    
    // Try DD.MM.YYYY (Serbian format)
    const serbianMatch = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (serbianMatch && serbianMatch[1] && serbianMatch[2] && serbianMatch[3]) {
      return new Date(
        parseInt(serbianMatch[3]),
        parseInt(serbianMatch[2]) - 1,
        parseInt(serbianMatch[1])
      );
    }
    
    // Try DD/MM/YYYY
    const slashMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch && slashMatch[1] && slashMatch[2] && slashMatch[3]) {
      return new Date(
        parseInt(slashMatch[3]),
        parseInt(slashMatch[2]) - 1,
        parseInt(slashMatch[1])
      );
    }
    
    return new Date();
  }
  
  /**
   * Parse amount from string (handles Serbian format)
   */
  private parseAmount(str: string): number {
    if (!str) return 0;
    // Serbian format: 1.234,56 -> 1234.56
    const normalized = str
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    return parseFloat(normalized) || 0;
  }
  
  /**
   * Auto-match transactions with invoices
   */
  async autoMatchTransactions(statementId: string): Promise<{
    matched: number;
    unmatched: number;
  }> {
    const statement = await prisma.bankStatement.findUnique({
      where: { id: statementId },
      include: { 
        transactions: { 
          where: { matchStatus: MatchStatus.UNMATCHED } 
        } 
      },
    });
    
    if (!statement) {
      throw new AppError('Statement not found', 404, 'NOT_FOUND');
    }
    
    let matched = 0;
    
    for (const transaction of statement.transactions) {
      // Try to match by reference number (poziv na broj)
      if (transaction.reference) {
        const invoice = await prisma.invoice.findFirst({
          where: {
            companyId: statement.companyId,
            invoiceNumber: transaction.reference,
          },
        });
        
        if (invoice) {
          await prisma.bankTransaction.update({
            where: { id: transaction.id },
            data: {
              matchStatus: MatchStatus.MATCHED,
              matchedInvoiceId: invoice.id,
            },
          });
          matched++;
          continue;
        }
      }
      
      // Try to match by partner account number - check JSON array
      if (transaction.partnerAccount) {
        // Since bankAccounts is JSON, we search for partners and check manually
        const partners = await prisma.partner.findMany({
          where: {
            companyId: statement.companyId,
          },
        });
        
        // Find partner with matching bank account in JSON
        const partner = partners.find(p => {
          if (!p.bankAccounts) return false;
          const accounts = p.bankAccounts as string[];
          return Array.isArray(accounts) && accounts.includes(transaction.partnerAccount!);
        });
        
        if (partner) {
          // Find unpaid invoice for this partner with similar amount
          const amount = Number(transaction.amount);
          
          const invoice = await prisma.invoice.findFirst({
            where: {
              companyId: statement.companyId,
              partnerId: partner.id,
              status: { in: [InvoiceStatus.SENT, InvoiceStatus.DELIVERED] },
              totalAmount: {
                gte: new Prisma.Decimal(amount * 0.99),
                lte: new Prisma.Decimal(amount * 1.01),
              },
            },
          });
          
          if (invoice) {
            await prisma.bankTransaction.update({
              where: { id: transaction.id },
              data: {
                matchStatus: MatchStatus.MATCHED,
                matchedInvoiceId: invoice.id,
              },
            });
            matched++;
          }
        }
      }
    }
    
    // Update statement status
    const unmatchedCount = await prisma.bankTransaction.count({
      where: { statementId, matchStatus: MatchStatus.UNMATCHED },
    });
    
    await prisma.bankStatement.update({
      where: { id: statementId },
      data: {
        status: unmatchedCount === 0 ? BankStatementStatus.MATCHED : BankStatementStatus.PROCESSING,
      },
    });
    
    return {
      matched,
      unmatched: unmatchedCount,
    };
  }
  
  /**
   * Manually match transaction to invoice
   */
  async matchTransaction(
    transactionId: string,
    invoiceId: string,
    _userId: string
  ): Promise<BankTransaction> {
    const transaction = await prisma.bankTransaction.findUnique({
      where: { id: transactionId },
    });
    
    if (!transaction) {
      throw new AppError('Transaction not found', 404, 'NOT_FOUND');
    }
    
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    
    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    }
    
    const updated = await prisma.bankTransaction.update({
      where: { id: transactionId },
      data: {
        matchStatus: MatchStatus.MATCHED,
        matchedInvoiceId: invoiceId,
      },
    });
    
    logger.info(`Manually matched transaction ${transactionId} to invoice ${invoiceId}`);
    
    return updated;
  }
  
  /**
   * Create payment from matched transaction
   */
  async createPaymentFromTransaction(
    transactionId: string,
    userId: string
  ): Promise<void> {
    const transaction = await prisma.bankTransaction.findUnique({
      where: { id: transactionId },
      include: { statement: true },
    });
    
    if (!transaction) {
      throw new AppError('Transaction not found', 404, 'NOT_FOUND');
    }
    
    if (transaction.matchStatus !== MatchStatus.MATCHED || !transaction.matchedInvoiceId) {
      throw new AppError('Transaction must be matched to create payment', 400, 'NOT_MATCHED');
    }
    
    const invoice = await prisma.invoice.findUnique({
      where: { id: transaction.matchedInvoiceId },
    });
    
    if (!invoice) {
      throw new AppError('Matched invoice not found', 404, 'NOT_FOUND');
    }
    
    const amount = Number(transaction.amount);
    
    // Create payment
    await prisma.payment.create({
      data: {
        invoiceId: transaction.matchedInvoiceId,
        amount: new Prisma.Decimal(amount),
        currency: 'RSD',
        paymentDate: transaction.valueDate || transaction.transactionDate,
        method: 'BANK_TRANSFER',
        status: PaymentStatus.CLEARED,
        reference: transaction.reference,
        bankAccount: transaction.statement.accountNumber,
        description: `Auto-created from bank statement ${transaction.statement.statementNumber}`,
        createdBy: userId,
      },
    });
    
    // Update transaction status
    await prisma.bankTransaction.update({
      where: { id: transactionId },
      data: { matchStatus: MatchStatus.MATCHED },
    });
    
    // Update invoice paid amount
    const payments = await prisma.payment.aggregate({
      where: { invoiceId: transaction.matchedInvoiceId, status: PaymentStatus.CLEARED },
      _sum: { amount: true },
    });
    
    const paidAmount = Number(payments._sum?.amount) || 0;
    
    let newStatus = invoice.status;
    let paymentStatus = invoice.paymentStatus;

    if (paidAmount >= Number(invoice.totalAmount)) {
      // newStatus = InvoiceStatus.ACCEPTED; // Don't change SEF status based on payment
      paymentStatus = InvoicePaymentStatus.PAID;
    } else if (paidAmount > 0) {
      paymentStatus = InvoicePaymentStatus.PARTIALLY_PAID;
    }
    
    await prisma.invoice.update({
      where: { id: transaction.matchedInvoiceId },
      data: {
        paidAmount: new Prisma.Decimal(paidAmount),
        status: newStatus,
        paymentStatus: paymentStatus,
      },
    });
    
    logger.info(`Created payment from bank transaction ${transactionId}`);
  }
  
  /**
   * Get bank statements for company
   */
  async getStatements(
    companyId: string,
    params?: {
      accountNumber?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: BankStatement[]; total: number }> {
    const where: Prisma.BankStatementWhereInput = { companyId };
    
    if (params?.accountNumber) {
      where.accountNumber = params.accountNumber;
    }
    if (params?.status && Object.values(BankStatementStatus).includes(params.status as BankStatementStatus)) {
      where.status = params.status as BankStatementStatus;
    }
    if (params?.startDate || params?.endDate) {
      where.statementDate = {};
      if (params.startDate) {
        where.statementDate.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.statementDate.lte = new Date(params.endDate);
      }
    }
    
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    
    const [data, total] = await Promise.all([
      prisma.bankStatement.findMany({
        where,
        orderBy: { statementDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { transactions: true } },
        },
      }),
      prisma.bankStatement.count({ where }),
    ]);
    
    return { data, total };
  }
  
  /**
   * Get statement with transactions
   */
  async getStatementWithTransactions(id: string): Promise<BankStatement | null> {
    return prisma.bankStatement.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { transactionDate: 'asc' },
        },
      },
    });
  }
  
  /**
   * Get unmatched transactions for company
   */
  async getUnmatchedTransactions(
    companyId: string,
    limit: number = 50
  ): Promise<BankTransaction[]> {
    return prisma.bankTransaction.findMany({
      where: { 
        statement: { companyId },
        matchStatus: MatchStatus.UNMATCHED 
      },
      orderBy: { transactionDate: 'desc' },
      take: limit,
      include: {
        statement: {
          select: { statementNumber: true, accountNumber: true },
        },
      },
    });
  }
}

export const bankStatementService = new BankStatementService();
