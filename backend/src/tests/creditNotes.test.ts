import request from 'supertest';
import app from '../index';
import { prisma } from '../db/prisma';
import { sign } from 'jsonwebtoken';
import { config } from '../config';
import { InvoiceStatus, CreditNoteStatus } from '@prisma/client';

describe('Credit Note Module Integration Tests', () => {
  let authToken: string;
  let companyId: string;
  let userId: string;
  let partnerId: string;
  let invoiceId: string;

  beforeAll(async () => {
    // 1. Create Company
    const company = await prisma.company.create({
      data: {
        name: 'Test Company CN',
        pib: '100000003',
        email: 'company-cn@example.com',
        address: 'Test Address 1',
        city: 'Belgrade',
        postalCode: '11000',
        sefApiKey: 'mock-api-key',
        sefEnvironment: 'demo',
      },
    });
    companyId = company.id;

    // 2. Create User
    const user = await prisma.user.create({
      data: {
        email: `test-cn-${Date.now()}@example.com`,
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'User CN',
        role: 'ADMIN',
        companyId: company.id,
      },
    });
    userId = user.id;

    // 3. Generate Token
    authToken = sign({ id: user.id, email: user.email, role: user.role, companyId: user.companyId }, config.JWT_SECRET, { expiresIn: '1h' });

    // 4. Create Refresh Token (Required for auth middleware)
    await prisma.refreshToken.create({
      data: {
        token: `refresh_token_cn_${Date.now()}`,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // 5. Create Partner
    const partner = await prisma.partner.create({
      data: {
        name: 'Test Partner CN',
        pib: '100000004',
        email: 'partner-cn@example.com',
        address: 'Partner Address 1',
        city: 'Novi Sad',
        postalCode: '21000',
        type: 'BUYER',
        companyId: company.id,
      },
    });
    partnerId = partner.id;

    // 6. Create Invoice (Must be SENT/DELIVERED/ACCEPTED)
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-CN-${Date.now()}`,
        companyId: company.id,
        partnerId: partner.id,
        status: InvoiceStatus.SENT,
        totalAmount: 1200,
        taxAmount: 200,
        issueDate: new Date(),
        dueDate: new Date(),
        lines: {
          create: [
            {
              lineNumber: 1,
              itemName: 'Test Item',
              quantity: 1,
              unitPrice: 1000,
              taxRate: 20,
              taxAmount: 200,
              amount: 1200,
            },
          ],
        },
      },
    });
    invoiceId = invoice.id;
  });

  afterAll(async () => {
    await prisma.creditNoteLine.deleteMany();
    await prisma.creditNote.deleteMany();
    await prisma.invoiceLine.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.partner.deleteMany();
    await prisma.user.deleteMany();
    await prisma.company.deleteMany();
    await prisma.$disconnect();
  });

  describe('Credit Note Creation', () => {
    it('should create a credit note from an existing invoice', async () => {
      const res = await request(app)
        .post('/api/credit-notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalInvoiceId: invoiceId,
          reason: 'Refund for damaged goods',
          lines: [
            {
              itemName: 'Test Item',
              quantity: 1,
              unitPrice: 1000,
              taxRate: 20,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.creditNoteNumber).toBeDefined();
      expect(res.body.data.status).toBe(CreditNoteStatus.DRAFT);
      expect(Number(res.body.data.totalAmount)).toBe(1200);
    });

    it('should fail to create credit note for non-existent invoice', async () => {
      const res = await request(app)
        .post('/api/credit-notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalInvoiceId: '00000000-0000-0000-0000-000000000000',
          reason: 'Invalid',
          lines: [],
        });

      expect(res.status).toBe(400); // Service throws generic Error which maps to 400/500
    });
  });

  describe('Credit Note Management', () => {
    let creditNoteId: string;

    beforeEach(async () => {
      // Create a fresh credit note for these tests
      const res = await request(app)
        .post('/api/credit-notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalInvoiceId: invoiceId,
          reason: 'Management Test',
          lines: [
            {
              itemName: 'Test Item',
              quantity: 1,
              unitPrice: 1000,
              taxRate: 20,
            },
          ],
        });
      creditNoteId = res.body.data.id;
    });

    it('should list credit notes', async () => {
      const res = await request(app)
        .get('/api/credit-notes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should get a single credit note', async () => {
      const res = await request(app)
        .get(`/api/credit-notes/${creditNoteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(creditNoteId);
    });

    it('should delete a draft credit note', async () => {
      const res = await request(app)
        .delete(`/api/credit-notes/${creditNoteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      // Verify deletion
      const check = await prisma.creditNote.findUnique({
        where: { id: creditNoteId },
      });
      expect(check).toBeNull();
    });
  });
});
