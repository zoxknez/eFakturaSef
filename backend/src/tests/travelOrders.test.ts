import request from 'supertest';
import app from '../index';
import { prisma } from '../db/prisma';
import { sign } from 'jsonwebtoken';
import { config } from '../config';
import { TravelOrderStatus, TravelOrderExpenseType } from '@sef-app/shared';

// Mock the queue
jest.mock('../queue/invoiceQueue', () => ({
  invoiceQueue: {
    add: jest.fn(),
  },
}));

describe('Travel Orders API', () => {
  let token: string;
  let companyId: string;
  let userId: string;
  let travelOrderId: string;

  beforeAll(async () => {
    // Cleanup potential leftovers
    await prisma.refreshToken.deleteMany({ where: { token: 'some-refresh-token' } });
    await prisma.user.deleteMany({ where: { email: 'travel-user@test.com' } });
    await prisma.company.deleteMany({ where: { pib: '100000003' } });

    // Create test company
    const company = await prisma.company.create({
      data: {
        name: 'Travel Test Company',
        pib: '100000003',
        address: 'Test Address',
        city: 'Belgrade',
        postalCode: '11000',
        email: 'travel@test.com'
      }
    });
    companyId = company.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'travel-user@test.com',
        password: 'hashed_password',
        firstName: 'Travel',
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

    // Create Refresh Token (Required by authMiddleware)
    await prisma.refreshToken.create({
      data: {
        token: 'some-refresh-token-' + Date.now(), // Unique token
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.travelOrderExpense.deleteMany({});
    await prisma.travelOrder.deleteMany({});
    await prisma.refreshToken.deleteMany({ where: { userId } }); // Cleanup refresh token
    await prisma.user.deleteMany({ where: { email: 'travel-user@test.com' } });
    await prisma.company.deleteMany({ where: { pib: '100000003' } });
    await prisma.$disconnect();
  });

  describe('POST /api/travel-orders', () => {
    it('should create a new travel order', async () => {
      const travelOrderData = {
        employeeName: 'John Doe',
        destination: 'Novi Sad',
        country: 'RS',
        departureDate: new Date().toISOString(),
        returnDate: new Date(Date.now() + 86400000).toISOString(), // +1 day
        vehicle: 'BG-123-XX',
        advanceAmount: 5000,
        status: TravelOrderStatus.DRAFT,
        expenses: [
          {
            type: TravelOrderExpenseType.FUEL,
            date: new Date().toISOString(),
            amount: 3000,
            description: 'Fuel refill'
          }
        ]
      };

      const res = await request(app)
        .post('/api/travel-orders')
        .set('Authorization', `Bearer ${token}`)
        .send(travelOrderData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.employeeName).toBe(travelOrderData.employeeName);
      expect(res.body.data.orderNumber).toBeDefined(); // Check for orderNumber
      expect(res.body.data.expenses).toHaveLength(1);
      expect(Number(res.body.data.totalExpenses)).toBe(3000);
      expect(Number(res.body.data.totalPayout)).toBe(3000 - 5000); // -2000

      travelOrderId = res.body.data.id;
    });

    it('should fail validation with missing fields', async () => {
      const res = await request(app)
        .post('/api/travel-orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          employeeName: 'Jane Doe'
          // Missing destination, dates, etc.
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/travel-orders', () => {
    it('should list travel orders', async () => {
      const res = await request(app)
        .get('/api/travel-orders')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.data)).toBe(true);
      expect(res.body.data.data.length).toBeGreaterThan(0);
      expect(res.body.data.data[0]).toHaveProperty('orderNumber');
    });

    it('should filter travel orders by search term', async () => {
      const res = await request(app)
        .get('/api/travel-orders?search=Novi Sad')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.data.length).toBeGreaterThan(0);
      expect(res.body.data.data[0].destination).toBe('Novi Sad');
    });
  });

  describe('GET /api/travel-orders/:id', () => {
    it('should get a travel order by id', async () => {
      const res = await request(app)
        .get(`/api/travel-orders/${travelOrderId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(travelOrderId);
      expect(res.body.data.expenses).toBeDefined();
    });

    it('should return 404 for non-existent travel order', async () => {
      const res = await request(app)
        .get('/api/travel-orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/travel-orders/:id', () => {
    it('should update a travel order', async () => {
      const updateData = {
        destination: 'Subotica',
        expenses: [
          {
            type: TravelOrderExpenseType.TOLL,
            date: new Date().toISOString(),
            amount: 500,
            description: 'Toll'
          }
        ]
      };

      const res = await request(app)
        .put(`/api/travel-orders/${travelOrderId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.destination).toBe('Subotica');
      expect(res.body.data.expenses).toHaveLength(1);
      expect(Number(res.body.data.totalExpenses)).toBe(500);
    });
  });

  describe('DELETE /api/travel-orders/:id', () => {
    it('should delete a travel order', async () => {
      const res = await request(app)
        .delete(`/api/travel-orders/${travelOrderId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deletion
      const check = await prisma.travelOrder.findUnique({
        where: { id: travelOrderId }
      });
      expect(check).toBeNull();
    });
  });
});
