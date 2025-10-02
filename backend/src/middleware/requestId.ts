import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function requestId(req: Request & { id?: string }, res: Response, next: NextFunction) {
  const id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
