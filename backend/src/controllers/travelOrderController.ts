import { Request, Response } from 'express';
import { travelOrderService } from '../services/travelOrderService';
import { TravelOrderSchema, TravelOrderExpenseSchema } from '@sef-app/shared';
import { z } from 'zod';

export class TravelOrderController {
  
  getTravelOrders = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // @ts-ignore - companyId will be added by auth middleware
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const result = await travelOrderService.list(companyId, page, limit, search);

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error fetching travel orders:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch travel orders' });
    }
  };

  getTravelOrderById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // @ts-ignore
      const companyId = req.user?.companyId;
      
      const travelOrder = await travelOrderService.get(companyId, id);

      if (!travelOrder) {
        return res.status(404).json({ success: false, error: 'Travel order not found' });
      }

      res.json({ success: true, data: travelOrder });
    } catch (error) {
      console.error('Error fetching travel order:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch travel order' });
    }
  };

  createTravelOrder = async (req: Request, res: Response) => {
    try {
      // @ts-ignore
      const companyId = req.user?.companyId;

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
      console.error('Error creating travel order:', error);
      res.status(500).json({ success: false, error: 'Failed to create travel order' });
    }
  };

  updateTravelOrder = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // @ts-ignore
      const companyId = req.user?.companyId;

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
      console.error('Error updating travel order:', error);
      res.status(500).json({ success: false, error: 'Failed to update travel order' });
    }
  };

  deleteTravelOrder = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // @ts-ignore
      const companyId = req.user?.companyId;

      await travelOrderService.delete(companyId, id);
      res.json({ success: true, message: 'Travel order deleted successfully' });
    } catch (error) {
      console.error('Error deleting travel order:', error);
      res.status(500).json({ success: false, error: 'Failed to delete travel order' });
    }
  };

  // Note: addExpense and removeExpense are not directly exposed in service yet, 
  // but updateTravelOrder handles expenses array replacement.
  // If we need granular expense management, we should add methods to service.
  // For now, I will remove these methods or implement them via update if needed.
  // Given the service implementation of update handles expenses, we can rely on that.
}
