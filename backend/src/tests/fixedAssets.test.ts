import request from 'supertest';
import app from '../index';
import { prisma } from '../db/prisma';
import bcrypt from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { config } from '../config';

describe('Fixed Assets API', () => {
  let authToken: string;
  let companyId: string;
  let userId: string;

  const TEST_PIB = '100000001';
  const TEST_EMAIL = 'fixed_assets_test@example.com';

  // Helper to clean up test data
  const cleanup = async () => {
    try {
      const company = await prisma.company.findFirst({ where: { pib: TEST_PIB } });
      if (company) {
        await prisma.fixedAsset.deleteMany({ where: { companyId: company.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: userId } }); // userId might be undefined if not set yet, but we can query by company users
        const users = await prisma.user.findMany({ where: { companyId: company.id } });
        for (const u of users) {
            await prisma.refreshToken.deleteMany({ where: { userId: u.id } });
        }
        await prisma.user.deleteMany({ where: { companyId: company.id } });
        await prisma.company.delete({ where: { id: company.id } });
      }
    } catch (error) {
      console.log('Cleanup error (ignoring):', error);
    }
  };

  beforeEach(async () => {
    await cleanup();

    // 2. Create Company
    const company = await prisma.company.create({
      data: {
        name: 'Test Company',
        pib: TEST_PIB,
        address: 'Test Address',
        city: 'Test City',
        postalCode: '11000',
        email: 'fixed_assets_company@test.com'
      }
    });
    companyId = company.id;

    // 3. Create User
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN',
        companyId: company.id
      }
    });
    userId = user.id;

    // 4. Generate Token
    authToken = sign(
      { id: user.id, email: user.email, role: user.role, companyId: user.companyId },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 5. Create Refresh Token (Required by authMiddleware)
    await prisma.refreshToken.create({
      data: {
        token: 'some-refresh-token-' + Date.now(),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  const mockAsset = {
    inventoryNumber: 'INV-001',
    name: 'Office Laptop',
    purchaseDate: new Date().toISOString(),
    purchaseValue: 150000,
    amortizationRate: 20,
    currentValue: 150000,
    accumulatedAmortization: 0,
    status: 'ACTIVE',
    location: 'Office 1',
    employee: 'John Doe'
  };

  describe('POST /api/fixed-assets', () => {
    it('should create a new fixed asset', async () => {
      const res = await request(app)
        .post('/api/fixed-assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockAsset);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.inventoryNumber).toBe(mockAsset.inventoryNumber);
      expect(res.body.data.companyId).toBe(companyId);
    });

    it('should fail validation with missing fields', async () => {
      const res = await request(app)
        .post('/api/fixed-assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Incomplete Asset'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/fixed-assets', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/fixed-assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockAsset);
    });

    it('should list fixed assets', async () => {
      const res = await request(app)
        .get('/api/fixed-assets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.data)).toBe(true);
      expect(res.body.data.data.length).toBe(1);
      expect(res.body.data.data[0].inventoryNumber).toBe(mockAsset.inventoryNumber);
    });

    it('should filter assets by search term', async () => {
      // Create another asset
      await request(app)
        .post('/api/fixed-assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...mockAsset,
          inventoryNumber: 'INV-002',
          name: 'Office Chair'
        });

      const res = await request(app)
        .get('/api/fixed-assets?search=Chair')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.data.length).toBe(1);
      expect(res.body.data.data[0].name).toBe('Office Chair');
    });
  });

  describe('GET /api/fixed-assets/:id', () => {
    let assetId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/fixed-assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockAsset);
      assetId = res.body.data.id;
    });

    it('should get a fixed asset by id', async () => {
      const res = await request(app)
        .get(`/api/fixed-assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(assetId);
    });

    it('should return 404 for non-existent asset', async () => {
      const res = await request(app)
        .get('/api/fixed-assets/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      // Note: Prisma might throw an error if ID format is invalid UUID, 
      // but controller handles "not found" logic. 
      // If ID is valid UUID but not found -> 404.
      // If ID is invalid UUID -> 500 or 400 depending on Prisma/Controller.
      // Let's assume UUID format for "non-existent-id" to be safe or just check failure.
      // Actually, "non-existent-id" is not a UUID, so Prisma might complain.
      // Let's use a valid UUID that doesn't exist.
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const res2 = await request(app)
        .get(`/api/fixed-assets/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);
        
      expect(res2.status).toBe(404);
    });
  });

  describe('PUT /api/fixed-assets/:id', () => {
    let assetId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/fixed-assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockAsset);
      assetId = res.body.data.id;
    });

    it('should update a fixed asset', async () => {
      const res = await request(app)
        .put(`/api/fixed-assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Laptop Name',
          currentValue: 140000
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Laptop Name');
      // Check if decimal is handled (might come back as string or number depending on serialization)
      // Prisma Decimal usually serializes to string in JSON to preserve precision, 
      // but supertest/express might convert it.
      // Let's just check truthiness for now or parse it.
      expect(Number(res.body.data.currentValue)).toBe(140000);
    });
  });

  describe('DELETE /api/fixed-assets/:id', () => {
    let assetId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/fixed-assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockAsset);
      assetId = res.body.data.id;
    });

    it('should delete a fixed asset', async () => {
      const res = await request(app)
        .delete(`/api/fixed-assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's gone
      const check = await prisma.fixedAsset.findUnique({
        where: { id: assetId }
      });
      expect(check).toBeNull();
    });
  });

  describe('POST /api/fixed-assets/calculate-amortization', () => {
    beforeEach(async () => {
      // Create an asset to amortize
      await request(app)
        .post('/api/fixed-assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...mockAsset,
          purchaseValue: 1000,
          currentValue: 1000,
          amortizationRate: 20 // 20% of 1000 = 200
        });
    });

    it('should preview amortization calculation', async () => {
      const res = await request(app)
        .post('/api/fixed-assets/calculate-amortization')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          year: new Date().getFullYear(),
          apply: false
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].amortizationAmount).toBe(200);
      expect(res.body.data[0].newValue).toBe(800);
    });

    it('should apply amortization', async () => {
      const res = await request(app)
        .post('/api/fixed-assets/calculate-amortization')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          year: new Date().getFullYear(),
          apply: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Verify DB update
      const assets = await prisma.fixedAsset.findMany({ where: { companyId } });
      expect(Number(assets[0].currentValue)).toBe(800);
      expect(Number(assets[0].accumulatedAmortization)).toBe(200);
    });
  });
});
