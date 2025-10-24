// Swagger/OpenAPI configuration
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '../config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SEF eFakture API',
      version: '1.0.0',
      description: 'RESTful API za sistem elektronskih faktura u Srbiji (SEF)',
      contact: {
        name: 'SEF eFakture Team',
        email: 'support@sef-efakture.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: config.NODE_ENV === 'production' 
          ? 'https://api.sef-efakture.com' 
          : 'http://localhost:3001',
        description: config.NODE_ENV === 'production' ? 'Production' : 'Development',
      },
      {
        url: 'https://staging-api.sef-efakture.com',
        description: 'Staging',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message' },
            requestId: { type: 'string', example: 'abc-123-def-456' },
          },
          required: ['success', 'error'],
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Validation failed' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'buyerPIB' },
                  message: { type: 'string', example: 'PIB must be 9 digits' },
                },
              },
            },
            requestId: { type: 'string' },
          },
        },
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            invoiceNumber: { type: 'string', example: 'INV-2024-001' },
            issueDate: { type: 'string', format: 'date-time' },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            status: {
              type: 'string',
              enum: ['DRAFT', 'SENT', 'DELIVERED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'STORNO', 'EXPIRED'],
            },
            type: {
              type: 'string',
              enum: ['OUTGOING', 'INCOMING'],
            },
            buyerName: { type: 'string', example: 'Kupac DOO' },
            buyerPIB: { type: 'string', example: '123456789' },
            buyerAddress: { type: 'string', nullable: true },
            buyerCity: { type: 'string', nullable: true },
            totalAmount: { type: 'string', format: 'decimal', example: '12000.00' },
            taxAmount: { type: 'string', format: 'decimal', example: '2400.00' },
            currency: { type: 'string', example: 'RSD' },
            sefId: { type: 'string', nullable: true },
            sefStatus: { type: 'string', nullable: true },
            companyId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/InvoiceItem' },
            },
          },
          required: ['id', 'invoiceNumber', 'issueDate', 'status', 'type', 'buyerName', 'buyerPIB', 'totalAmount', 'taxAmount', 'currency'],
        },
        InvoiceItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Usluga konsaltinga' },
            quantity: { type: 'string', format: 'decimal', example: '10.00' },
            unitPrice: { type: 'string', format: 'decimal', example: '1000.00' },
            taxRate: { type: 'string', format: 'decimal', example: '20.00' },
            taxAmount: { type: 'string', format: 'decimal', example: '2000.00' },
            totalAmount: { type: 'string', format: 'decimal', example: '12000.00' },
            unit: { type: 'string', example: 'hours', nullable: true },
          },
          required: ['name', 'quantity', 'unitPrice', 'taxRate', 'taxAmount', 'totalAmount'],
        },
        InvoiceCreate: {
          type: 'object',
          properties: {
            invoiceNumber: { type: 'string', example: 'INV-2024-001' },
            issueDate: { type: 'string', format: 'date-time' },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            type: {
              type: 'string',
              enum: ['OUTGOING', 'INCOMING'],
              example: 'OUTGOING',
            },
            buyerName: { type: 'string', example: 'Kupac DOO' },
            buyerPIB: { type: 'string', pattern: '^[0-9]{9}$', example: '123456789' },
            buyerAddress: { type: 'string', nullable: true },
            buyerCity: { type: 'string', nullable: true },
            currency: { type: 'string', example: 'RSD', default: 'RSD' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  quantity: { type: 'number', minimum: 0 },
                  unitPrice: { type: 'number', minimum: 0 },
                  taxRate: { type: 'number', minimum: 0, maximum: 100 },
                  unit: { type: 'string', nullable: true },
                },
                required: ['name', 'quantity', 'unitPrice', 'taxRate'],
              },
              minItems: 1,
            },
          },
          required: ['invoiceNumber', 'issueDate', 'type', 'buyerName', 'buyerPIB', 'items'],
        },
        InvoiceUpdate: {
          type: 'object',
          properties: {
            invoiceNumber: { type: 'string' },
            issueDate: { type: 'string', format: 'date-time' },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            buyerName: { type: 'string' },
            buyerPIB: { type: 'string', pattern: '^[0-9]{9}$' },
            buyerAddress: { type: 'string', nullable: true },
            buyerCity: { type: 'string', nullable: true },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  quantity: { type: 'number', minimum: 0 },
                  unitPrice: { type: 'number', minimum: 0 },
                  taxRate: { type: 'number', minimum: 0, maximum: 100 },
                  unit: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        InvoiceListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Invoice' },
            },
            pagination: { $ref: '#/components/schemas/CursorPagination' },
          },
        },
        InvoiceSendResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Invoice sent to SEF successfully' },
            data: {
              type: 'object',
              properties: {
                sefId: { type: 'string', example: 'SEF-2024-12345' },
                status: { type: 'string', example: 'SENT' },
                sentAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        CursorPagination: {
          type: 'object',
          properties: {
            nextCursor: { type: 'string', nullable: true },
            hasMore: { type: 'boolean' },
            limit: { type: 'number' },
            count: { type: 'number' },
          },
        },
        Company: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Moja Firma DOO' },
            pib: { type: 'string', pattern: '^[0-9]{9}$', example: '987654321' },
            address: { type: 'string' },
            city: { type: 'string' },
            postalCode: { type: 'string' },
            country: { type: 'string', example: 'RS' },
            sefApiKey: { type: 'string', nullable: true },
            sefEnvironment: { type: 'string', enum: ['DEMO', 'PRODUCTION'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'ACCOUNTANT', 'AUDITOR', 'OPERATOR'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        LoginRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', format: 'password', example: 'password123' },
          },
          required: ['email', 'password'],
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                user: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Unauthorized - Invalid or missing JWT token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Unauthorized',
                requestId: 'abc-123-def-456',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Invoice not found',
                requestId: 'abc-123-def-456',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error - Invalid request body',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationError' },
            },
          },
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Too many requests, please try again later',
                requestId: 'abc-123-def-456',
              },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Internal server error',
                requestId: 'abc-123-def-456',
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Autentikacija i autorizacija' },
      { name: 'Invoices', description: 'CRUD operacije za fakture' },
      { name: 'SEF Integration', description: 'Integracija sa SEF API-jem (slanje, status, otkazivanje)' },
      { name: 'Company', description: 'Upravljanje kompanijama' },
      { name: 'Dashboard', description: 'Dashboard i statistika' },
      { name: 'Exports', description: 'PDF i Excel exporti' },
      { name: 'Bulk', description: 'Bulk operacije' },
      { name: 'Webhooks', description: 'SEF webhook callbacks' },
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Monitoring', description: 'Monitoring i metrics' },
    ],
  },
  apis: [
    './src/routes/*.ts', // Path to API routes
    './src/controllers/*.ts', // Path to controllers
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

