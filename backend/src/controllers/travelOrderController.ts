import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { travelOrderService } from '../services/travelOrderService';
import { TravelOrderSchema, TravelOrderExpenseSchema } from '@sef-app/shared';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { parseOffsetPagination, parseStringParam, parseDateParam } from '../utils/pagination';

export class TravelOrderController {
  
  getTravelOrders = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page = 1, limit = 10 } = parseOffsetPagination(req.query as Record<string, string>);
      const search = parseStringParam(req.query.search);
      const status = parseStringParam(req.query.status);
      const startDate = parseDateParam(req.query.startDate);
      const endDate = parseDateParam(req.query.endDate);

      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const result = await travelOrderService.list(companyId, page, limit, search);

      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Error fetching travel orders:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch travel orders' });
    }
  };

  getTravelOrderById = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const travelOrder = await travelOrderService.get(companyId, id);

      if (!travelOrder) {
        return res.status(404).json({ success: false, error: 'Travel order not found' });
      }

      res.json({ success: true, data: travelOrder });
    } catch (error) {
      logger.error('Error fetching travel order:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch travel order' });
    }
  };

  createTravelOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const validatedData = TravelOrderSchema.omit({ 
        id: true, 
        createdAt: true, 
        updatedAt: true, 
        number: true,
        totalExpenses: true,
        totalPayout: true,
        companyId: true
      }).parse(req.body);

      const travelOrder = await travelOrderService.create(companyId, validatedData);
      res.status(201).json({ success: true, data: travelOrder });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors });
      }
      logger.error('Error creating travel order:', error);
      res.status(500).json({ success: false, error: 'Failed to create travel order' });
    }
  };

  updateTravelOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const validatedData = TravelOrderSchema.partial().omit({
        id: true,
        createdAt: true,
        updatedAt: true,
        number: true,
        totalExpenses: true,
        totalPayout: true,
        companyId: true
      }).parse(req.body);

      const travelOrder = await travelOrderService.update(companyId, id, validatedData);
      res.json({ success: true, data: travelOrder });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors });
      }
      logger.error('Error updating travel order:', error);
      res.status(500).json({ success: false, error: 'Failed to update travel order' });
    }
  };

  deleteTravelOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      await travelOrderService.delete(companyId, id);
      res.json({ success: true, message: 'Travel order deleted successfully' });
    } catch (error) {
      logger.error('Error deleting travel order:', error);
      res.status(500).json({ success: false, error: 'Failed to delete travel order' });
    }
  };

  // Note: addExpense and removeExpense are not directly exposed in service yet, 
  // but updateTravelOrder handles expenses array replacement.
  // If we need granular expense management, we should add methods to service.
  // For now, I will remove these methods or implement them via update if needed.
  // Given the service implementation of update handles expenses, we can rely on that.
}
