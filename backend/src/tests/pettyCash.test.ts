
import request from 'supertest';
import app from '../index';
import { prisma } from '../db/prisma';
import { sign } from 'jsonwebtoken';
import { config } from '../config';
import { PettyCashType } from '@sef-app/shared';

describe('Petty Cash API', () => {
  let token: string;
  let companyId: string;
  let userId: string;
  let accountId: string;

  beforeAll(async () => {
    // Cleanup potential leftovers
    await prisma.pettyCashEntry.deleteMany({});
    await prisma.pettyCashAccount.deleteMany({});
    await prisma.refreshToken.deleteMany({ where: { token: { startsWith: 'petty-cash-test-' } } });
    await prisma.user.deleteMany({ where: { email: 'petty-cash@test.com' } });
    await prisma.company.deleteMany({ where: { pib: '100000010' } });

    // Create test company
    const company = await prisma.company.create({
      data: {
        name: 'Petty Cash Test Company',
        pib: '100000010',
        address: 'Test Address',
        city: 'Belgrade',
        postalCode: '11000',
        email: 'petty@test.com'
      }
    });
    companyId = company.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'petty-cash@test.com',
        password: 'hashed_password',
        firstName: 'Petty',
        lastName: 'Cash',
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
        token: 'petty-cash-test-' + Date.now(),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.pettyCashEntry.deleteMany({});
    await prisma.pettyCashAccount.deleteMany({});
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: 'petty-cash@test.com' } });
    await prisma.company.deleteMany({ where: { pib: '100000010' } });
    await prisma.$disconnect();
  });

  describe('POST /api/petty-cash/accounts', () => {
    it('should create a new petty cash account', async () => {
      const res = await request(app)
        .post('/api/petty-cash/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Main Treasury',
          currency: 'RSD'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('Main Treasury');
      expect(Number(res.body.data.balance)).toBe(0);

      accountId = res.body.data.id;
    });

    it('should fail if name is missing', async () => {
      const res = await request(app)
        .post('/api/petty-cash/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currency: 'RSD'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/petty-cash/accounts', () => {
    it('should list accounts', async () => {
      const res = await request(app)
        .get('/api/petty-cash/accounts')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].id).toBe(accountId);
    });
  });

  describe('GET /api/petty-cash/accounts/:id', () => {
    it('should get account by id', async () => {
      const res = await request(app)
        .get(`/api/petty-cash/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(accountId);
    });
  });

  describe('POST /api/petty-cash/entries', () => {
    it('should create a deposit entry', async () => {
      const entryData = {
        accountId,
        entryNumber: '1/2025',
        date: new Date().toISOString(),
        type: PettyCashType.DEPOSIT,
        amount: 10000,
        description: 'Initial deposit'
      };

      const res = await request(app)
        .post('/api/petty-cash/entries')
        .set('Authorization', `Bearer ${token}`)
        .send(entryData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.amount)).toBe(10000);
      
      // Check account balance update
      const account = await prisma.pettyCashAccount.findUnique({ where: { id: accountId } });
      expect(Number(account?.balance)).toBe(10000);
    });

    it('should create a withdrawal entry', async () => {
      const entryData = {
        accountId,
        entryNumber: '2/2025',
        date: new Date().toISOString(),
        type: PettyCashType.WITHDRAWAL,
        amount: 2000,
        description: 'Office supplies'
      };

      const res = await request(app)
        .post('/api/petty-cash/entries')
        .set('Authorization', `Bearer ${token}`)
        .send(entryData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      
      // Check account balance update
      const account = await prisma.pettyCashAccount.findUnique({ where: { id: accountId } });
      expect(Number(account?.balance)).toBe(8000); // 10000 - 2000
    });
  });

  describe('GET /api/petty-cash/entries', () => {
    it('should list entries for account', async () => {
      const res = await request(app)
        .get(`/api/petty-cash/entries?accountId=${accountId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data.length).toBe(2); // Deposit + Withdrawal
    });
  });

  describe('GET /api/petty-cash/accounts/:accountId/next-number', () => {
    it('should get next entry number', async () => {
      const res = await request(app)
        .get(`/api/petty-cash/accounts/${accountId}/next-number`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.number).toBeDefined();
    });
  });
});
