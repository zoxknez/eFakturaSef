
import request from 'supertest';
import app from '../index';
import { prisma } from '../db/prisma';
import { sign } from 'jsonwebtoken';
import { config } from '../config';
import { PartnerType } from '@prisma/client';

describe('Import Module Integration Tests', () => {
  let authToken: string;
  let companyId: string;
  let userId: string;

  beforeAll(async () => {
    // Cleanup potential leftovers
    try {
      const existingCompany = await prisma.company.findFirst({ where: { pib: '100000006' } });
      if (existingCompany) {
        await prisma.invoiceLine.deleteMany({ where: { invoice: { companyId: existingCompany.id } } });
        await prisma.invoice.deleteMany({ where: { companyId: existingCompany.id } });
        await prisma.product.deleteMany({ where: { companyId: existingCompany.id } });
        await prisma.partner.deleteMany({ where: { companyId: existingCompany.id } });
        await prisma.refreshToken.deleteMany({ where: { user: { companyId: existingCompany.id } } });
        await prisma.user.deleteMany({ where: { companyId: existingCompany.id } });
        await prisma.company.delete({ where: { id: existingCompany.id } });
      }
    } catch (e) {
      console.log('Cleanup error:', e);
    }

    // 1. Create Company
    const company = await prisma.company.create({
      data: {
        name: 'Import Test Company',
        pib: '100000006',
        address: 'Test Address Import',
        city: 'Belgrade',
        postalCode: '11000',
        email: 'import@test.com',
      },
    });
    companyId = company.id;

    // 2. Create User
    const user = await prisma.user.create({
      data: {
        email: `import_test_${Date.now()}@test.com`,
        password: 'hashed_password',
        firstName: 'Import',
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
        token: `refresh_token_imp_${Date.now()}`,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    await prisma.invoiceLine.deleteMany({ where: { invoice: { companyId } } });
    await prisma.invoice.deleteMany({ where: { companyId } });
    await prisma.product.deleteMany({ where: { companyId } });
    await prisma.partner.deleteMany({ where: { companyId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
  });

  describe('Import Partners', () => {
    it('should import new partners', async () => {
      const data = [
        {
          name: 'Imported Partner 1',
          pib: '100000007',
          address: 'Address 1',
          city: 'City 1',
          postalCode: '11000',
          email: 'p1@test.com',
          type: 'BUYER'
        },
        {
          name: 'Imported Partner 2',
          pib: '100000008',
          address: 'Address 2',
          city: 'City 2',
          postalCode: '21000',
          type: 'SUPPLIER'
        }
      ];

      const res = await request(app)
        .post('/api/import/partners')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imported).toBe(2);
      expect(res.body.data.failed).toBe(0);

      const partners = await prisma.partner.findMany({ where: { companyId } });
      expect(partners.length).toBe(2);
    });

    it('should update existing partners', async () => {
      const data = [
        {
          name: 'Updated Partner 1',
          pib: '100000007', // Same PIB
          address: 'New Address 1',
          city: 'New City 1',
          postalCode: '11000',
          type: 'BUYER'
        }
      ];

      const res = await request(app)
        .post('/api/import/partners')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data });

      expect(res.status).toBe(200);
      expect(res.body.data.imported).toBe(1);

      const partner = await prisma.partner.findFirst({ where: { companyId, pib: '100000007' } });
      expect(partner?.name).toBe('Updated Partner 1');
      expect(partner?.address).toBe('New Address 1');
    });

    it('should handle validation errors', async () => {
      const data = [
        {
          name: 'Invalid Partner',
          pib: '123', // Invalid PIB
          type: 'BUYER'
        }
      ];

      const res = await request(app)
        .post('/api/import/partners')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data });

      expect(res.status).toBe(200);
      expect(res.body.data.failed).toBe(1);
      expect(res.body.data.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Import Products', () => {
    it('should import new products', async () => {
      const data = [
        {
          code: 'IMP-001',
          name: 'Imported Product 1',
          unit: 'kom',
          price: '100.50',
          vatRate: '20'
        },
        {
          code: 'IMP-002',
          name: 'Imported Product 2',
          unit: 'kg',
          price: '200',
          vatRate: '10'
        }
      ];

      const res = await request(app)
        .post('/api/import/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data });

      expect(res.status).toBe(200);
      expect(res.body.data.imported).toBe(2);

      const products = await prisma.product.findMany({ where: { companyId } });
      expect(products.length).toBe(2);
    });
  });

  describe('Import Invoices', () => {
    it('should import invoices and create missing partner', async () => {
      const data = [
        {
          invoiceNumber: 'IMP-INV-001',
          issueDate: '2023-01-01',
          dueDate: '2023-01-15',
          buyerName: 'New Buyer via Invoice',
          buyerPIB: '100000009',
          totalAmount: '1200',
          taxAmount: '200',
          currency: 'RSD'
        }
      ];

      const res = await request(app)
        .post('/api/import/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data });

      expect(res.status).toBe(200);
      expect(res.body.data.imported).toBe(1);

      // Check Invoice
      const invoice = await prisma.invoice.findFirst({ where: { companyId, invoiceNumber: 'IMP-INV-001' } });
      expect(invoice).toBeDefined();
      expect(Number(invoice?.totalAmount)).toBe(1200);

      // Check Partner creation
      const partner = await prisma.partner.findFirst({ where: { companyId, pib: '100000009' } });
      expect(partner).toBeDefined();
      expect(partner?.name).toBe('New Buyer via Invoice');
    });
  });
});
