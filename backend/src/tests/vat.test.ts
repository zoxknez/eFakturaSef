
import request from 'supertest';
import app from '../index';
import { prisma } from '../db/prisma';
import { sign } from 'jsonwebtoken';
import { config } from '../config';
import { VATRecordType, InvoiceStatus, InvoiceType } from '@prisma/client';

describe('VAT API', () => {
  let token: string;
  let companyId: string;
  let userId: string;
  let invoiceId: string;

  beforeAll(async () => {
    // Cleanup
    await prisma.vATRecord.deleteMany({});
    await prisma.invoiceLine.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.refreshToken.deleteMany({ where: { token: { startsWith: 'vat-test-' } } });
    await prisma.user.deleteMany({ where: { email: 'vat-user@test.com' } });
    await prisma.company.deleteMany({ where: { pib: '100000006' } });

    // Create test company
    const company = await prisma.company.create({
      data: {
        name: 'VAT Test Company',
        pib: '100000006',
        address: 'Test Address',
        city: 'Belgrade',
        postalCode: '11000',
        email: 'vat@test.com'
      }
    });
    companyId = company.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'vat-user@test.com',
        password: 'hashed_password',
        firstName: 'VAT',
        lastName: 'User',
        role: 'ADMIN',
        companyId: company.id
      }
    });
    userId = user.id;

    // Generate token
    token = sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        companyId: user.companyId 
      },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create Refresh Token
    await prisma.refreshToken.create({
      data: {
        token: 'vat-test-' + Date.now(),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    // Create a test invoice to generate VAT from
    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        invoiceNumber: 'INV-VAT-001',
        issueDate: new Date(),
        dueDate: new Date(),
        status: InvoiceStatus.SENT,
        type: InvoiceType.OUTGOING,
        totalAmount: 1200,
        taxAmount: 200,
        buyerName: 'Test Buyer',
        buyerPIB: '100000007',
        lines: {
          create: [
            {
              lineNumber: 1,
              itemName: 'Service',
              quantity: 1,
              unitPrice: 1000,
              taxRate: 20,
              taxAmount: 200,
              amount: 1200
            }
          ]
        }
      }
    });
    invoiceId = invoice.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.vATRecord.deleteMany({});
    await prisma.invoiceLine.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: 'vat-user@test.com' } });
    await prisma.company.deleteMany({ where: { pib: '100000006' } });
    await prisma.$disconnect();
  });

  describe('POST /api/vat/calculate', () => {
    it('should calculate VAT from invoice', async () => {
      const res = await request(app)
        .post('/api/vat/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ invoiceId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify VAT Record
      const record = await prisma.vATRecord.findFirst({
        where: { invoiceId }
      });
      expect(record).toBeDefined();
      expect(record?.type).toBe(VATRecordType.OUTPUT);
      expect(Number(record?.taxBase20)).toBe(1000);
      expect(Number(record?.vatAmount20)).toBe(200);
    });
  });

  describe('GET /api/vat/summary', () => {
    it('should get VAT summary for current month', async () => {
      const now = new Date();
      const res = await request(app)
        .get(`/api/vat/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.output.taxBase20).toBe(1000);
      expect(res.body.data.output.vatAmount20).toBe(200);
    });
  });

  describe('GET /api/vat/pppdv', () => {
    it('should generate PPPDV form data', async () => {
      const now = new Date();
      const res = await request(app)
        .get(`/api/vat/pppdv?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Section 1 - Promet
      expect(res.body.data.section1.line101).toBe(1000); // Base 20%
      // Section 2 - PDV
      expect(res.body.data.section2.line201).toBe(200); // VAT 20%
      // Section 4 - Payment
      expect(res.body.data.section4.line401).toBe(200); // To Pay
    });
  });

  describe('GET /api/vat/export/kpr', () => {
    it('should export KPR (Sales Book)', async () => {
      const now = new Date();
      const res = await request(app)
        .get(`/api/vat/export/kpr?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].brojRacuna).toBe('INV-VAT-001');
    });
  });
});
