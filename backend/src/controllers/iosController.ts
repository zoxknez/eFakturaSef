/**
 * IOS Controller
 * Izvod otvorenih stavki endpoints
 */

import { Request, Response, NextFunction } from 'express';
import IOSService from '../services/iosService';
import EmailNotificationService from '../services/emailNotificationService';
import logger from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    companyId: string;
    role: string;
  };
}

export class IOSController {
  /**
   * Generate IOS for partner
   */
  static async generate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { partnerId, asOfDate } = req.body;

      if (!partnerId) {
        return res.status(400).json({
          success: false,
          error: 'partnerId is required',
        });
      }

      const ios = await IOSService.generateIOS(
        companyId,
        partnerId,
        asOfDate ? new Date(asOfDate) : new Date()
      );

      res.status(201).json({ success: true, data: ios });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get IOS by ID
   */
  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const ios = await IOSService.getById(id, companyId);

      if (!ios) {
        return res.status(404).json({
          success: false,
          error: 'IOS not found',
        });
      }

      res.json({ success: true, data: ios });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all IOS reports
   */
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { partnerId, status, fromDate, toDate, page, limit } = req.query;

      const result = await IOSService.getAll(companyId, {
        partnerId: partnerId as string,
        status: status as string,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send IOS via email
   */
  static async send(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      // Mark as sent
      await IOSService.markAsSent(id, companyId);

      // Send email
      try {
        await EmailNotificationService.sendIOSRequest(companyId, id);
      } catch (emailError) {
        logger.warn('Failed to send IOS email', { iosId: id, error: emailError });
      }

      const ios = await IOSService.getById(id, companyId);

      res.json({ success: true, data: ios });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm IOS
   */
  static async confirm(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const { notes } = req.body;

      const ios = await IOSService.confirmIOS(id, companyId, notes);

      res.json({ success: true, data: ios });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Dispute IOS
   */
  static async dispute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const { notes } = req.body;

      if (!notes) {
        return res.status(400).json({
          success: false,
          error: 'Notes are required for dispute',
        });
      }

      const ios = await IOSService.disputeIOS(id, companyId, notes);

      res.json({ success: true, data: ios });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get partner balance summary
   */
  static async getPartnerBalances(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;

      const balances = await IOSService.getPartnerBalanceSummary(companyId);

      res.json({ success: true, data: balances });
    } catch (error) {
      next(error);
    }
  }
}

export default IOSController;
