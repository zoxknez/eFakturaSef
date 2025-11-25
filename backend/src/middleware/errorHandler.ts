import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val: any) => val.message);
    error = new ValidationError(message.join(', '));
  }

  // Prisma validation error
  if (err instanceof Prisma.PrismaClientValidationError) {
    error = new ValidationError('Invalid data provided');
  }

  // Prisma unique constraint error
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = err.meta?.target;
      error = new ConflictError(`${field} already exists`);
    } else if (err.code === 'P2025') {
      error = new NotFoundError('Record not found');
    } else {
      error = new AppError('Database operation failed', 500);
    }
  }

  // Zod validation error
  if (err instanceof ZodError) {
    const message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    error = new ValidationError(message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired');
  }

  // Custom AppError
  if (err instanceof AppError) {
    error = err;
  }

  // Duplicate key error (MongoDB)
  if (err.code === 11000) {
    error = new ConflictError('Duplicate field value entered');
  }

  // Cast error (MongoDB)
  if (err.name === 'CastError') {
    error = new ValidationError('Invalid ID format');
  }

  // Rate limit error
  if (err.status === 429) {
    error = new AppError('Too many requests', 429);
  }

  // Default to 500 server error
  if (!error.statusCode) {
    error = new AppError('Internal server error', 500);
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.statusCode).json({
    success: false,
    error: error.message,
    ...(isDevelopment && {
      stack: error.stack,
      details: err.details || null
    }),
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  });
};