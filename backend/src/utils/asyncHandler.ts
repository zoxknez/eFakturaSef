import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async route handler to catch errors and pass them to the error handling middleware
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
