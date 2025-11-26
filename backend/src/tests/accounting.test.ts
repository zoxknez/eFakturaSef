
import request from 'supertest';
import app from '../index';
import { prisma } from '../db/prisma';
import { sign } from 'jsonwebtoken';
import { config } from '../config';

describe('Accounting Module Integration Tests', () => {
  let authToken: string;
  let companyId: string;
  let userId: string;
  let accountId1: string;
  let accountId2: string;

  beforeAll(async () => {
    // 1. Create Company
    const company = await prisma.company.create({
      data: {
        name: 'Accounting Test Company',
        pib: '100000011',
        address: 'Test Address 1',
        city: 'Belgrade',
        postalCode: '11000',
        email: 'accounting@test.com',
      },
    });
    companyId = company.id;

    // 2. Create User
    const user = await prisma.user.create({
      data: {
        email: `accounting_test_${Date.now()}@test.com`,
        password: 'hashed_password',
        firstName: 'Accounting',
        lastName: 'Tester',
        role: 'ADMIN',
        companyId: company.id,
      },
    });
    userId = user.id;

    // 3. Generate Token
    authToken = sign({ id: user.id, email: user.email, role: user.role, companyId: user.companyId }, config.JWT_SECRET, { expiresIn: '1h' });

    // 4. Create Refresh Token (Required by authMiddleware)
    await prisma.refreshToken.create({
      data: {
        token: `refresh_token_${Date.now()}`,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    await prisma.journalLine.deleteMany({ where: { journalEntry: { companyId } } });
    await prisma.journalEntry.deleteMany({ where: { companyId } });
    await prisma.account.deleteMany({ where: { companyId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
  });

  describe('Chart of Accounts', () => {
    it('should create a new account', async () => {
      const res = await request(app)
        .post('/api/accounting/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: '12',
          name: 'Bank Account',
          type: 'ASSET',
          normalSide: 'DEBIT',
          description: 'Main Bank Account',
          isActive: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('12');
      accountId1 = res.body.data.id;
    });

    it('should create another account', async () => {
      const res = await request(app)
        .post('/api/accounting/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: '20',
          name: 'Accounts Payable',
          type: 'LIABILITY',
          normalSide: 'CREDIT',
          description: 'Suppliers',
          isActive: true
        });

      expect(res.status).toBe(201);
      accountId2 = res.body.data.id;
    });

    it('should list accounts', async () => {
      const res = await request(app)
        .get('/api/accounting/accounts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Journal Entries', () => {
    let journalEntryId: string;

    it('should create a draft journal entry', async () => {
      const res = await request(app)
        .post('/api/accounting/journals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: new Date().toISOString(),
          description: 'Initial Deposit',
          reference: 'REF-001',
          type: 'MANUAL',
          lines: [
            {
              accountId: accountId1, // Asset (Debit)
              description: 'Deposit to Bank',
              debitAmount: 10000,
              creditAmount: 0
            },
            {
              accountId: accountId2, // Liability (Credit)
              description: 'Loan from Owner',
              debitAmount: 0,
              creditAmount: 10000
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      expect(Number(res.body.data.totalDebit)).toBe(10000);
      journalEntryId = res.body.data.id;
    });

    it('should post the journal entry', async () => {
      const res = await request(app)
        .post(`/api/accounting/journals/${journalEntryId}/post`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('POSTED');
    });

    it('should reflect in account balance', async () => {
      const res = await request(app)
        .get(`/api/accounting/accounts/${accountId1}/balance`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // Asset account: Debit increases balance
      expect(Number(res.body.data.balance)).toBe(10000);
    });

    it('should reflect in general ledger', async () => {
      const res = await request(app)
        .get(`/api/accounting/ledger/${accountId1}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.entries.length).toBeGreaterThan(0);
      expect(Number(res.body.data.entries[0].debit)).toBe(10000);
    });
  });

  describe('Financial Reports', () => {
    it('should generate a balance sheet', async () => {
      const res = await request(app)
        .get('/api/accounting/reports/balance-sheet')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // We expect Assets to be 10000
      expect(res.body.data.assets.totalAssets).toBe(10000);
    });
  });
});
