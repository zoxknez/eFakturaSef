// Input sanitization middleware
import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';
import { logger } from '../utils/logger';

/**
 * Sanitize a single value
 */
function sanitizeValue(value: any, options: SanitizeOptions = {}): any {
  const { 
    allowHTML = false, 
    trimWhitespace = true,
    removeNullBytes = true,
  } = options;

  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, options));
  }

  // Handle objects
  if (typeof value === 'object' && value !== null) {
    const sanitized: any = {};
    for (const [key, val] of Object.entries(value)) {
      // Sanitize the key as well
      const sanitizedKey = sanitizeValue(key, { allowHTML: false, trimWhitespace: true });
      sanitized[sanitizedKey] = sanitizeValue(val, options);
    }
    return sanitized;
  }

  // Handle strings
  if (typeof value === 'string') {
    let sanitized = value;

    // Remove null bytes (security risk)
    if (removeNullBytes) {
      sanitized = sanitized.replace(/\0/g, '');
    }

    // Trim whitespace
    if (trimWhitespace) {
      sanitized = sanitized.trim();
    }

    // XSS Protection: sanitize HTML
    if (!allowHTML) {
      // Remove all HTML tags
      sanitized = DOMPurify.sanitize(sanitized, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
      });
    } else {
      // Allow limited safe HTML
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
        ALLOWED_ATTR: [],
      });
    }

    // SQL Injection Protection: escape special SQL characters
    // Note: This is defense-in-depth; Prisma ORM already protects against SQL injection
    sanitized = validator.escape(sanitized);

    // Unescape common HTML entities back (since we escaped everything)
    // This allows normal text with special chars like & < > to work
    sanitized = sanitized
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');

    return sanitized;
  }

  // Return other types as-is (numbers, booleans, etc.)
  return value;
}

export interface SanitizeOptions {
  allowHTML?: boolean;
  trimWhitespace?: boolean;
  removeNullBytes?: boolean;
}

/**
 * Middleware to sanitize request body, query, and params
 */
export const sanitizeInput = (options: SanitizeOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body, options);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeValue(req.query, {
          ...options,
          allowHTML: false, // Never allow HTML in query params
        }) as any;
      }

      // Sanitize URL parameters
      if (req.params && typeof req.params === 'object') {
        req.params = sanitizeValue(req.params, {
          ...options,
          allowHTML: false, // Never allow HTML in URL params
        });
      }

      next();
    } catch (error: any) {
      logger.error('Sanitization error', {
        error: error.message,
        stack: error.stack,
      });
      
      // Continue anyway - sanitization failure shouldn't break the app
      next();
    }
  };
};

/**
 * Validate and sanitize specific field types
 */
export const validators = {
  /**
   * Validate email address
   */
  email(value: string): string | null {
    if (!validator.isEmail(value)) {
      return null;
    }
    return validator.normalizeEmail(value) || value.toLowerCase().trim();
  },

  /**
   * Validate URL
   */
  url(value: string): string | null {
    if (!validator.isURL(value, { require_protocol: true })) {
      return null;
    }
    return value.trim();
  },

  /**
   * Validate UUID
   */
  uuid(value: string): string | null {
    if (!validator.isUUID(value)) {
      return null;
    }
    return value.trim();
  },

  /**
   * Validate PIB (Serbian tax ID - 9 digits)
   */
  pib(value: string): string | null {
    const cleaned = value.replace(/\s/g, '');
    if (!/^\d{9}$/.test(cleaned)) {
      return null;
    }
    return cleaned;
  },

  /**
   * Validate numeric string
   */
  numeric(value: string): number | null {
    if (!validator.isNumeric(value, { no_symbols: true })) {
      return null;
    }
    return parseFloat(value);
  },

  /**
   * Validate alphanumeric string
   */
  alphanumeric(value: string): string | null {
    if (!validator.isAlphanumeric(value, 'en-US', { ignore: ' -_' })) {
      return null;
    }
    return value.trim();
  },

  /**
   * Validate date string
   */
  date(value: string): Date | null {
    if (!validator.isISO8601(value)) {
      return null;
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  },

  /**
   * Sanitize invoice number (alphanumeric + some special chars)
   */
  invoiceNumber(value: string): string | null {
    // Allow: letters, numbers, dash, slash, underscore
    const cleaned = value.trim();
    if (!/^[A-Za-z0-9\-\/\_]+$/.test(cleaned)) {
      return null;
    }
    return cleaned;
  },
};

/**
 * Middleware to block potentially dangerous patterns
 */
export const blockDangerousPatterns = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const dangerousPatterns = [
    // SQL Injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(-{2}|\/\*|\*\/)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
    
    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    
    // Path traversal
    /\.\.[\/\\]/,
    
    // Command injection
    /[;&|`$()]/,
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          return true;
        }
      }
    } else if (Array.isArray(value)) {
      return value.some(checkValue);
    } else if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  try {
    // Check all input sources
    const sources = [req.body, req.query, req.params];
    
    for (const source of sources) {
      if (source && checkValue(source)) {
        logger.warn('Dangerous pattern detected in request', {
          ip: req.ip,
          path: req.path,
          method: req.method,
        });
        
        return res.status(400).json({
          success: false,
          error: 'Invalid input detected',
        });
      }
    }

    next();
  } catch (error: any) {
    logger.error('Pattern blocking error', error);
    next(); // Continue on error
  }
};

