import { Request, Response, NextFunction } from 'express';
import { bankStatementService } from '../services/bankStatementService';
import { AppError } from '../utils/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import multer from 'multer';

// Helper to get authenticated companyId
function getCompanyId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  const companyId = authReq.user?.companyId;
  if (!companyId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  return companyId;
}

// Helper to get authenticated userId
function getUserId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  return userId;
}

// Helper to get param ID with validation
function getParamId(req: Request, paramName: string = 'id'): string {
  const id = req.params[paramName];
  if (!id) {
    throw new AppError(`${paramName} is required`, 400, 'BAD_REQUEST');
  }
  return id;
}

// Multer configuration for file upload
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'text/xml',
      'application/xml',
      'text/csv',
      'application/csv',
      'text/plain',
    ];
    if (allowedMimes.includes(file.mimetype) || 
        file.originalname.endsWith('.xml') ||
        file.originalname.endsWith('.csv') ||
        file.originalname.endsWith('.mt940') ||
        file.originalname.endsWith('.sta')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only XML, CSV, and MT940 files are allowed.'));
    }
  },
});

export const bankStatementController = {
  /**
   * Import bank statement from uploaded file
   * POST /api/bank-statements/import
   */
  async importStatement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = getCompanyId(req);
      const file = req.file;
      
      if (!file) {
        throw new AppError('No file uploaded', 400, 'NO_FILE');
      }
      
      // Detect format from file extension
      let format: 'xml' | 'csv' | 'mt940' = 'xml';
      const fileName = file.originalname.toLowerCase();
      
      if (fileName.endsWith('.csv')) {
        format = 'csv';
      } else if (fileName.endsWith('.mt940') || fileName.endsWith('.sta')) {
        format = 'mt940';
      }
      
      // Override with request param if provided
      if (req.body.format && ['xml', 'csv', 'mt940'].includes(req.body.format)) {
        format = req.body.format;
      }
      
      const statement = await bankStatementService.importStatement(
        companyId,
        file.buffer,
        file.originalname,
        format
      );
      
      // Statement includes transactions from Prisma query
      const statementWithTransactions = statement as typeof statement & { 
        transactions?: Array<{ id: string }> 
      };
      
      res.status(201).json({
        success: true,
        data: statement,
        message: `Uspešno uvezen izvod sa ${statementWithTransactions.transactions?.length ?? 0} transakcija`,
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get all bank statements
   * GET /api/bank-statements
   */
  async getStatements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = getCompanyId(req);
      const { accountNumber, status, startDate, endDate, page, limit } = req.query;
      
      const result = await bankStatementService.getStatements(companyId, {
        accountNumber: accountNumber as string,
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      
      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 20,
        },
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get single statement with transactions
   * GET /api/bank-statements/:id
   */
  async getStatement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const statement = await bankStatementService.getStatementWithTransactions(id);
      
      if (!statement) {
        throw new AppError('Statement not found', 404, 'NOT_FOUND');
      }
      
      res.json({
        success: true,
        data: statement,
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Auto-match transactions in a statement
   * POST /api/bank-statements/:id/auto-match
   */
  async autoMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const result = await bankStatementService.autoMatchTransactions(id);
      
      res.json({
        success: true,
        data: result,
        message: `Automatski upareno ${result.matched} transakcija, preostalo ${result.unmatched} neuparenih`,
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Manually match transaction to invoice
   * POST /api/bank-statements/transactions/:transactionId/match
   */
  async matchTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transactionId = getParamId(req, 'transactionId');
      const userId = getUserId(req);
      const { invoiceId } = req.body;
      
      if (!invoiceId) {
        throw new AppError('invoiceId is required', 400, 'BAD_REQUEST');
      }
      
      const transaction = await bankStatementService.matchTransaction(
        transactionId,
        invoiceId,
        userId
      );
      
      res.json({
        success: true,
        data: transaction,
        message: 'Transakcija uspešno uparena sa fakturom',
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Create payment from matched transaction
   * POST /api/bank-statements/transactions/:transactionId/create-payment
   */
  async createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transactionId = getParamId(req, 'transactionId');
      const userId = getUserId(req);
      
      await bankStatementService.createPaymentFromTransaction(transactionId, userId);
      
      res.json({
        success: true,
        message: 'Plaćanje uspešno kreirano iz transakcije',
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get unmatched transactions
   * GET /api/bank-statements/transactions/unmatched
   */
  async getUnmatchedTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = getCompanyId(req);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const transactions = await bankStatementService.getUnmatchedTransactions(companyId, limit);
      
      res.json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      next(error);
    }
  },
};
