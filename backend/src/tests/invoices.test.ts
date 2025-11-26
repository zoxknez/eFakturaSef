import request from 'supertest';
import app from '../index';
import { prisma } from '../db/prisma';
import { sign } from 'jsonwebtoken';
import { config } from '../config';
import { InvoiceStatus, InvoiceType } from '@prisma/client';

describe('Invoice Module Integration Tests', () => {
  let authToken: string;
  let companyId: string;
  let userId: string;
  let partnerId: string;
  let productId: string;
  let invoiceId: string;

  beforeAll(async () => {
    // 1. Create Company
    const company = await prisma.company.create({
      data: {
        name: 'Invoice Test Company',
        pib: '100000004',
        address: 'Test Address Invoice',
        city: 'Belgrade',
        postalCode: '11000',
        email: 'invoice@test.com',
        autoStockDeduction: true, // Enable to test stock logic
      },
    });
    companyId = company.id;

    // 2. Create User
    const user = await prisma.user.create({
      data: {
        email: `invoice_test_${Date.now()}@test.com`,
        password: 'hashed_password',
        firstName: 'Invoice',
        lastName: 'Tester',
        role: 'ADMIN',
        companyId: company.id,
      },
    });
    userId = user.id;

    // 3. Generate Token
    authToken = sign({ id: user.id, email: user.email, role: user.role, companyId: user.companyId }, config.JWT_SECRET, { expiresIn: '1h' });

    // 4. Create Refresh Token
    await prisma.refreshToken.create({
      data: {
        token: `refresh_token_inv_${Date.now()}`,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // 5. Create Partner
    const partner = await prisma.partner.create({
      data: {
        companyId,
        name: 'Test Partner',
        pib: '100000005',
        address: 'Partner Address',
        city: 'Novi Sad',
        postalCode: '21000',
        email: 'partner@test.com',
        type: 'BUYER',
      },
    });
    partnerId = partner.id;

    // 6. Create Product
    const product = await prisma.product.create({
      data: {
        companyId,
        name: 'Test Product',
        code: 'PROD-001',
        unit: 'kom',
        unitPrice: 100,
        vatRate: 20,
        trackInventory: true,
        currentStock: 100,
      },
    });
    productId = product.id;
  });

  afterAll(async () => {
    // Cleanup in reverse order of dependency
    await prisma.inventoryTransaction.deleteMany({ where: { companyId } });
    await prisma.invoiceLine.deleteMany({ where: { invoice: { companyId } } });
    await prisma.invoice.deleteMany({ where: { companyId } });
    await prisma.product.deleteMany({ where: { companyId } });
    await prisma.partner.deleteMany({ where: { companyId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
  });

  describe('Invoice CRUD', () => {
    it('should create a new invoice', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          companyId,
          partnerId,
          invoiceNumber: 'INV-2023-001',
          issueDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 86400000).toISOString(), // +1 day
          currency: 'RSD',
          note: 'Test Invoice',
          type: InvoiceType.OUTGOING,
          lines: [
            {
              name: 'Service Item',
              quantity: 2,
              unitPrice: 1000,
              taxRate: 20
            },
            {
              name: 'Product Item',
              quantity: 5,
              unitPrice: 100,
              taxRate: 20,
              productId: productId
            }
          ]
        });

      if (res.status !== 201) {
        console.error('Create Invoice Error:', res.body);
      }
      expect(res.status).toBe(201);
      expect(res.body.invoiceNumber).toBe('INV-2023-001');
      expect(res.body.status).toBe(InvoiceStatus.DRAFT);
      expect(res.body.lines.length).toBe(2);
      
      // Check totals
      // Line 1: 2 * 1000 = 2000 + 20% = 2400
      // Line 2: 5 * 100 = 500 + 20% = 600
      // Total: 3000
      expect(Number(res.body.totalAmount)).toBe(3000);
      
      invoiceId = res.body.id;
    });

    it('should verify stock deduction', async () => {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      // Initial 100 - 5 sold = 95
      expect(Number(product?.currentStock)).toBe(95);
    });

    it('should get the invoice by ID', async () => {
      const res = await request(app)
        .get(`/api/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(invoiceId);
      expect(res.body.partner.id).toBe(partnerId);
    });

    it('should list invoices', async () => {
      const res = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].invoiceNumber).toBe('INV-2023-001');
    });

    it('should update the invoice', async () => {
      const res = await request(app)
        .put(`/api/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          note: 'Updated Note',
          buyerCity: 'Updated City'
        });

      expect(res.status).toBe(200);
      expect(res.body.note).toBe('Updated Note');
      expect(res.body.buyerCity).toBe('Updated City');
    });

    it('should delete the invoice', async () => {
      const res = await request(app)
        .delete(`/api/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Invoice deleted successfully');
    });

    it('should verify stock restoration after delete', async () => {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      // Should be back to 100
      expect(Number(product?.currentStock)).toBe(100);
    });

    it('should not find the deleted invoice', async () => {
      const res = await request(app)
        .get(`/api/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });
});
