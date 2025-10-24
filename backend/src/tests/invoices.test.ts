import request from 'supertest';
import app from '../index';
import { prisma } from '../db/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';

describe('Invoices', () => {
  let authToken: string;
  let companyId: string;
  let userId: string;

  beforeEach(async () => {
    // Clean up test data
    await prisma.invoiceLine.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.user.deleteMany();
    await prisma.company.deleteMany();

    // Create test company
    const company = await prisma.company.create({
      data: {
        pib: '123456789',
        name: 'Test Company',
        address: 'Test Address',
        city: 'Test City',
        postalCode: '11000',
        country: 'RS'
      }
    });
    companyId = company.id;

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 12);
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: 'OPERATOR',
        companyId: company.id
      }
    });
    userId = user.id;

    // Generate auth token
    authToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, companyId: company.id },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/invoices', () => {
    it('should create invoice successfully', async () => {
      const invoiceData = {
        companyId,
        invoiceNumber: '2024-001',
        issueDate: '2024-01-01',
        buyerName: 'Test Buyer',
        buyerPIB: '987654321',
        lines: [
          {
            name: 'Test Item',
            quantity: 1,
            unitPrice: 100,
            taxRate: 20
          }
        ]
      };

      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(201);

      expect(response.body.invoiceNumber).toBe('2024-001');
      expect(response.body.buyerName).toBe('Test Buyer');
      expect(response.body.lines).toHaveLength(1);
      expect(response.body.lines[0].itemName).toBe('Test Item');
    });

    it('should fail without authentication', async () => {
      const invoiceData = {
        companyId,
        invoiceNumber: '2024-001',
        issueDate: '2024-01-01',
        buyerName: 'Test Buyer',
        buyerPIB: '987654321',
        lines: [
          {
            name: 'Test Item',
            quantity: 1,
            unitPrice: 100,
            taxRate: 20
          }
        ]
      };

      const response = await request(app)
        .post('/api/invoices')
        .send(invoiceData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid data', async () => {
      const invoiceData = {
        companyId,
        invoiceNumber: '', // Invalid: empty
        issueDate: '2024-01-01',
        buyerName: 'Test Buyer',
        buyerPIB: '123', // Invalid: too short
        lines: [] // Invalid: empty lines
      };

      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/invoices', () => {
    beforeEach(async () => {
      // Create test invoices
      const invoice1 = await prisma.invoice.create({
        data: {
          companyId,
          invoiceNumber: '2024-001',
          issueDate: new Date('2024-01-01'),
          buyerName: 'Test Buyer 1',
          buyerPIB: '987654321',
          totalAmount: 120,
          taxAmount: 20,
          status: 'DRAFT',
          type: 'OUTGOING'
        }
      });

      const invoice2 = await prisma.invoice.create({
        data: {
          companyId,
          invoiceNumber: '2024-002',
          issueDate: new Date('2024-01-02'),
          buyerName: 'Test Buyer 2',
          buyerPIB: '987654322',
          totalAmount: 240,
          taxAmount: 40,
          status: 'SENT',
          type: 'OUTGOING'
        }
      });

      // Add invoice lines
      await prisma.invoiceLine.createMany({
        data: [
          {
            invoiceId: invoice1.id,
            lineNumber: 1,
            itemName: 'Test Item 1',
            quantity: 1,
            unitPrice: 100,
            taxRate: 20,
            amount: 120
          },
          {
            invoiceId: invoice2.id,
            lineNumber: 1,
            itemName: 'Test Item 2',
            quantity: 2,
            unitPrice: 100,
            taxRate: 20,
            amount: 240
          }
        ]
      });
    });

    it('should get all invoices', async () => {
      const response = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/invoices?status=DRAFT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('DRAFT');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/invoices?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.total).toBe(2);
    });
  });

  describe('GET /api/invoices/:id', () => {
    let invoiceId: string;

    beforeEach(async () => {
      const invoice = await prisma.invoice.create({
        data: {
          companyId,
          invoiceNumber: '2024-001',
          issueDate: new Date('2024-01-01'),
          buyerName: 'Test Buyer',
          buyerPIB: '987654321',
          totalAmount: 120,
          taxAmount: 20,
          status: 'DRAFT',
          type: 'OUTGOING'
        }
      });
      invoiceId = invoice.id;

      await prisma.invoiceLine.create({
        data: {
          invoiceId: invoice.id,
          lineNumber: 1,
          itemName: 'Test Item',
          quantity: 1,
          unitPrice: 100,
          taxRate: 20,
          amount: 120
        }
      });
    });

    it('should get invoice by id', async () => {
      const response = await request(app)
        .get(`/api/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(invoiceId);
      expect(response.body.invoiceNumber).toBe('2024-001');
      expect(response.body.lines).toHaveLength(1);
    });

    it('should return 404 for non-existent invoice', async () => {
      const response = await request(app)
        .get('/api/invoices/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Invoice not found');
    });
  });

  describe('PUT /api/invoices/:id', () => {
    let invoiceId: string;

    beforeEach(async () => {
      const invoice = await prisma.invoice.create({
        data: {
          companyId,
          invoiceNumber: '2024-001',
          issueDate: new Date('2024-01-01'),
          buyerName: 'Test Buyer',
          buyerPIB: '987654321',
          totalAmount: 120,
          taxAmount: 20,
          status: 'DRAFT',
          type: 'OUTGOING'
        }
      });
      invoiceId = invoice.id;
    });

    it('should update invoice successfully', async () => {
      const updateData = {
        buyerName: 'Updated Buyer',
        buyerPIB: '987654322'
      };

      const response = await request(app)
        .put(`/api/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.buyerName).toBe('Updated Buyer');
      expect(response.body.buyerPIB).toBe('987654322');
    });

    it('should not update sent invoice', async () => {
      // Update invoice to SENT status
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'SENT' }
      });

      const updateData = {
        buyerName: 'Updated Buyer'
      };

      const response = await request(app)
        .put(`/api/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Only drafts can be updated');
    });
  });

  describe('DELETE /api/invoices/:id', () => {
    let invoiceId: string;

    beforeEach(async () => {
      const invoice = await prisma.invoice.create({
        data: {
          companyId,
          invoiceNumber: '2024-001',
          issueDate: new Date('2024-01-01'),
          buyerName: 'Test Buyer',
          buyerPIB: '987654321',
          totalAmount: 120,
          taxAmount: 20,
          status: 'DRAFT',
          type: 'OUTGOING'
        }
      });
      invoiceId = invoice.id;
    });

    it('should delete draft invoice', async () => {
      const response = await request(app)
        .delete(`/api/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Invoice deleted successfully');

      // Verify invoice is deleted
      const deletedInvoice = await prisma.invoice.findUnique({
        where: { id: invoiceId }
      });
      expect(deletedInvoice).toBeNull();
    });

    it('should not delete sent invoice', async () => {
      // Update invoice to SENT status
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'SENT' }
      });

      const response = await request(app)
        .delete(`/api/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBe('Only drafts can be deleted');
    });
  });
});
