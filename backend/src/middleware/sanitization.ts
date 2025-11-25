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

    // Remove null bytes (security risk - can bypass filters)
    if (removeNullBytes) {
      sanitized = sanitized.replace(/\0/g, '');
    }

    // Trim whitespace
    if (trimWhitespace) {
      sanitized = sanitized.trim();
    }

    // XSS Protection: sanitize HTML using DOMPurify
    // DOMPurify is sufficient - it handles XSS protection properly
    if (!allowHTML) {
      // Remove all HTML tags, keep only text content
      sanitized = DOMPurify.sanitize(sanitized, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
      });
    } else {
      // Allow limited safe HTML (for rich text fields like notes)
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: [],
      });
    }

    // Note: SQL Injection protection is NOT needed here because:
    // 1. Prisma ORM uses parameterized queries (automatic protection)
    // 2. validator.escape() was creating unnecessary double-escaping
    // 3. The escape/unescape cycle was redundant and potentially buggy
    
    // DOMPurify already handles XSS, so we're done

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
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Sanitize body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body, options);
      }

      // Sanitize query parameters (Express 5: req.query is read-only, modify in place)
      if (req.query && typeof req.query === 'object') {
        const sanitizedQuery = sanitizeValue(req.query, {
          ...options,
          allowHTML: false, // Never allow HTML in query params
        }) as any;
        // Modify properties in place instead of reassigning
        for (const key of Object.keys(req.query)) {
          delete (req.query as any)[key];
        }
        Object.assign(req.query, sanitizedQuery);
      }

      // Sanitize URL parameters (Express 5: req.params is read-only, modify in place)
      if (req.params && typeof req.params === 'object') {
        const sanitizedParams = sanitizeValue(req.params, {
          ...options,
          allowHTML: false, // Never allow HTML in URL params
        });
        // Modify properties in place instead of reassigning
        for (const key of Object.keys(req.params)) {
          delete (req.params as any)[key];
        }
        Object.assign(req.params, sanitizedParams);
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
    const trimmed = value.trim();
    if (!validator.isEmail(trimmed)) {
      return null;
    }
    return validator.normalizeEmail(trimmed) || trimmed.toLowerCase();
  },

  /**
   * Validate URL
   */
  url(value: string): string | null {
    const trimmed = value.trim();
    if (!validator.isURL(trimmed, { require_protocol: true })) {
      return null;
    }
    return trimmed;
  },

  /**
   * Validate UUID
   */
  uuid(value: string): string | null {
    const trimmed = value.trim();
    if (!validator.isUUID(trimmed)) {
      return null;
    }
    return trimmed;
  },

  /**
   * Validate PIB (Serbian tax ID - 9 digits)
   */
  pib(value: string): string | null {
    // Remove whitespace and validate format
    const cleaned = value.replace(/\s/g, '');
    if (!/^\d{9}$/.test(cleaned)) {
      return null;
    }
    return cleaned;
  },

  /**
   * Validate JMBG (Serbian personal ID - 13 digits)
   */
  jmbg(value: string): string | null {
    const cleaned = value.replace(/\s/g, '');
    if (!/^\d{13}$/.test(cleaned)) {
      return null;
    }
    return cleaned;
  },

  /**
   * Validate numeric string
   */
  numeric(value: string): number | null {
    const trimmed = value.trim();
    if (!validator.isNumeric(trimmed, { no_symbols: true })) {
      return null;
    }
    return parseFloat(trimmed);
  },

  /**
   * Validate decimal number (allows decimals)
   */
  decimal(value: string): number | null {
    const trimmed = value.trim();
    if (!validator.isDecimal(trimmed)) {
      return null;
    }
    return parseFloat(trimmed);
  },

  /**
   * Validate alphanumeric string
   */
  alphanumeric(value: string, allowSpaces: boolean = false): string | null {
    const trimmed = value.trim();
    const ignore = allowSpaces ? ' -_' : '-_';
    if (!validator.isAlphanumeric(trimmed, 'en-US', { ignore })) {
      return null;
    }
    return trimmed;
  },

  /**
   * Validate date string (ISO 8601)
   */
  date(value: string): Date | null {
    const trimmed = value.trim();
    if (!validator.isISO8601(trimmed)) {
      return null;
    }
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date;
  },

  /**
   * Validate invoice number (alphanumeric + dash, slash, underscore)
   */
  invoiceNumber(value: string): string | null {
    const trimmed = value.trim();
    // Allow: letters, numbers, dash, slash, underscore, space
    if (!/^[A-Za-z0-9\-\/\_ ]+$/.test(trimmed)) {
      return null;
    }
    // Max length 50 characters
    if (trimmed.length > 50) {
      return null;
    }
    return trimmed;
  },

  /**
   * Validate phone number (flexible Serbian format)
   */
  phone(value: string): string | null {
    // Remove spaces, dashes, parentheses
    const cleaned = value.replace(/[\s\-\(\)]/g, '');
    // Serbian phone: +381... or 0... (6-15 digits total)
    if (!/^(\+381|0)\d{6,14}$/.test(cleaned)) {
      return null;
    }
    return cleaned;
  },

  /**
   * Validate bank account number (Serbian format)
   */
  bankAccount(value: string): string | null {
    // Remove dashes and spaces
    const cleaned = value.replace(/[\s\-]/g, '');
    // Serbian bank account: 18 digits
    if (!/^\d{18}$/.test(cleaned)) {
      return null;
    }
    return cleaned;
  },
};

/**
 * Middleware to block potentially dangerous patterns
 * 
 * IMPORTANT: These patterns are designed to catch ACTUAL attacks, not keywords in text.
 * We need to be careful not to block legitimate user input like:
 * - "I want to SELECT the best option" (contains SELECT keyword)
 * - Mathematical expressions: "price > 100 AND quantity < 50"
 * - Email addresses: "user+tag@example.com"
 * - Phone numbers with special characters
 */
export const blockDangerousPatterns = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const dangerousPatterns = [
    // SQL Injection - structural patterns only (not just keywords)
    // Match actual SQL injection attempts, not text containing SQL words
    /['"]?\s*(OR|AND)\s+['"]?[\d\w]+['"]?\s*=\s*['"]?[\d\w]+/i, // ' OR '1'='1
    /UNION\s+(ALL\s+)?SELECT/i, // UNION SELECT attack
    /;\s*(DROP|DELETE|TRUNCATE|INSERT|UPDATE)\s+(TABLE|DATABASE|INTO)/i, // ; DROP TABLE
    /\/\*.*\*\//s, // SQL comments (/* */)
    /-{2}\s*[\r\n]/,  // SQL line comments (-- followed by newline)
    
    // XSS - actual attack patterns
    /<script[^>]*>[\s\S]*?<\/script>/gi, // <script> tags with any content
    /<iframe[^>]*>/gi, // <iframe> tags
    /javascript:\s*[^\s]/gi, // javascript: protocol
    /on(load|error|click|mouse\w+|focus|blur|change|submit)\s*=/gi, // Event handlers
    /<img[^>]+src\s*=\s*[^>]*onerror/gi, // <img> with onerror
    
    // Path traversal - must be actual traversal attempt
    /\.\.[\/\\]{1,2}/,  // ../ or ..\ (directory traversal)
    /\.\.[\/\\]\.\./, // Multiple levels: ../../
    
    // Command injection - actual shell metacharacters in suspicious context
    // Allow these in normal text, but block shell command patterns
    /[;&|]\s*(ls|cat|rm|mv|cp|wget|curl|bash|sh|python|perl|ruby|node|php)\s/i,
    /`[^`]*`/, // Backticks (command substitution)
    /\$\([^)]*\)/, // $() command substitution
  ];

  const checkValue = (value: any, path: string = ''): { matched: boolean; pattern?: string; value?: string } => {
    if (typeof value === 'string') {
      // Skip checking very short strings (< 3 chars) - unlikely to be attacks
      if (value.length < 3) {
        return { matched: false };
      }

      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          return { 
            matched: true, 
            pattern: pattern.toString(), 
            value: value.substring(0, 100) // Log first 100 chars only
          };
        }
      }
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const result = checkValue(value[i], `${path}[${i}]`);
        if (result.matched) return result;
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const [key, val] of Object.entries(value)) {
        const result = checkValue(val, path ? `${path}.${key}` : key);
        if (result.matched) return result;
      }
    }
    return { matched: false };
  };

  try {
    // Check all input sources
    const sources = [
      { name: 'body', data: req.body },
      { name: 'query', data: req.query },
      { name: 'params', data: req.params },
    ];
    
    for (const source of sources) {
      if (source.data) {
        const result = checkValue(source.data, source.name);
        if (result.matched) {
          logger.warn('Dangerous pattern detected in request', {
            ip: req.ip,
            path: req.path,
            method: req.method,
            source: source.name,
            pattern: result.pattern,
            matchedValue: result.value,
            userAgent: req.get('user-agent'),
          });
          
          return res.status(400).json({
            success: false,
            error: 'Invalid input detected - potentially malicious content',
            code: 'DANGEROUS_PATTERN_DETECTED',
          });
        }
      }
    }

    return next();
  } catch (error: any) {
    logger.error('Pattern blocking error', {
      error: error.message,
      stack: error.stack,
    });
    // Fail open - continue on error to avoid blocking legitimate requests
    return next();
  }
};

