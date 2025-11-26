
import request from 'supertest';
import app from '../index';
import { prisma } from '../db/prisma';
import { sign } from 'jsonwebtoken';
import { config } from '../config';
import { CalculationStatus, InventoryTransactionType } from '@prisma/client';

describe('Calculations API', () => {
  let token: string;
  let companyId: string;
  let userId: string;
  let productId: string;
  let calculationId: string;

  beforeAll(async () => {
    // Cleanup
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.calculationItem.deleteMany({});
    await prisma.calculation.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.refreshToken.deleteMany({ where: { token: { startsWith: 'calc-test-' } } });
    await prisma.user.deleteMany({ where: { email: 'calc-user@test.com' } });
    await prisma.company.deleteMany({ where: { pib: '100000005' } });

    // Create test company
    const company = await prisma.company.create({
      data: {
        name: 'Calculation Test Company',
        pib: '100000005',
        address: 'Test Address',
        city: 'Belgrade',
        postalCode: '11000',
        email: 'calc@test.com'
      }
    });
    companyId = company.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'calc-user@test.com',
        password: 'hashed_password',
        firstName: 'Calc',
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
        token: 'calc-test-' + Date.now(),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    // Create test product
    const product = await prisma.product.create({
      data: {
        companyId,
        code: 'TEST-PROD-001',
        name: 'Test Product',
        unitPrice: 100,
        vatRate: 20,
        trackInventory: true,
        currentStock: 0
      }
    });
    productId = product.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.calculationItem.deleteMany({});
    await prisma.calculation.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: 'calc-user@test.com' } });
    await prisma.company.deleteMany({ where: { pib: '100000005' } });
    await prisma.$disconnect();
  });

  describe('POST /api/calculations', () => {
    it('should create a new calculation draft', async () => {
      const calcData = {
        date: new Date().toISOString(),
        number: 'KALK-001',
        items: [
          {
            productId,
            quantity: 10,
            supplierPrice: 80, // Nabavna
            expensePerUnit: 5, // Trosak
            marginPercent: 20, // Marza
            vatRate: 20
          }
        ]
      };

      const res = await request(app)
        .post('/api/calculations')
        .set('Authorization', `Bearer ${token}`)
        .send(calcData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(CalculationStatus.DRAFT);
      expect(res.body.data.items).toHaveLength(1);
      
      // Verify calculations
      const item = res.body.data.items[0];
      // Cost = 80 + 5 = 85
      expect(Number(item.costPrice)).toBe(85);
      // Margin = 85 * 0.2 = 17
      expect(Number(item.marginAmount)).toBe(17);
      // Sales No VAT = 85 + 17 = 102
      expect(Number(item.salesPriceNoVat)).toBe(102);
      // Sales With VAT = 102 * 1.2 = 122.4
      expect(Number(item.salesPrice)).toBe(122.4);

      calculationId = res.body.data.id;
    });

    it('should fail validation with missing fields', async () => {
      const res = await request(app)
        .post('/api/calculations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          number: 'KALK-FAIL'
          // Missing items
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/calculations', () => {
    it('should list calculations', async () => {
      const res = await request(app)
        .get('/api/calculations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].id).toBe(calculationId);
    });
  });

  describe('GET /api/calculations/:id', () => {
    it('should get calculation by id', async () => {
      const res = await request(app)
        .get(`/api/calculations/${calculationId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(calculationId);
      expect(res.body.data.items).toBeDefined();
    });
  });

  describe('POST /api/calculations/:id/post', () => {
    it('should post calculation and update inventory', async () => {
      const res = await request(app)
        .post(`/api/calculations/${calculationId}/post`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(CalculationStatus.POSTED);

      // Verify Inventory Update
      const product = await prisma.product.findUnique({ where: { id: productId } });
      expect(Number(product?.currentStock)).toBe(10); // 0 + 10
      expect(Number(product?.unitPrice)).toBe(122.4); // Updated price

      // Verify Transaction Record
      const tx = await prisma.inventoryTransaction.findFirst({
        where: { 
          productId, 
          referenceId: calculationId,
          type: InventoryTransactionType.PURCHASE
        }
      });
      expect(tx).toBeDefined();
      expect(Number(tx?.quantity)).toBe(10);
    });

    it('should fail to post already posted calculation', async () => {
      const res = await request(app)
        .post(`/api/calculations/${calculationId}/post`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500); // Or 400 depending on implementation
      expect(res.body.success).toBe(false);
    });
  });
});
