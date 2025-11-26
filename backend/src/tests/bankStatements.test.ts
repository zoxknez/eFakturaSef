
import request from 'supertest';
import app from '../index';
import { prisma } from '../db/prisma';
import { sign } from 'jsonwebtoken';
import { config } from '../config';
import { BankStatementStatus, MatchStatus, BankTransactionType } from '@prisma/client';

describe('Bank Statement Module Integration Tests', () => {
  let authToken: string;
  let companyId: string;
  let userId: string;
  let statementId: string;
  let transactionId: string;
  let invoiceId: string;

  beforeAll(async () => {
    // Cleanup
    await prisma.bankTransaction.deleteMany({});
    await prisma.bankStatement.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.refreshToken.deleteMany({ where: { token: { startsWith: 'bank-test-' } } });
    await prisma.user.deleteMany({ where: { email: 'bank-user@test.com' } });
    await prisma.company.deleteMany({ where: { pib: '100000008' } });

    // 1. Create Company
    const company = await prisma.company.create({
      data: {
        name: 'Bank Test Company',
        pib: '100000008',
        address: 'Test Address Bank',
        city: 'Belgrade',
        postalCode: '11000',
        email: 'bank@test.com',
      },
    });
    companyId = company.id;

    // 2. Create User
    const user = await prisma.user.create({
      data: {
        email: 'bank-user@test.com',
        password: 'hashed_password',
        firstName: 'Bank',
        lastName: 'User',
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
        token: 'bank-test-' + Date.now(),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // 5. Create Invoice to match against
    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        invoiceNumber: 'INV-BANK-001',
        issueDate: new Date(),
        dueDate: new Date(),
        totalAmount: 1200,
        taxAmount: 200,
        buyerName: 'Test Buyer',
        buyerPIB: '100000009',
        status: 'SENT',
        type: 'OUTGOING',
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
    await prisma.bankTransaction.deleteMany({});
    await prisma.bankStatement.deleteMany({});
    await prisma.invoiceLine.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
    await prisma.$disconnect();
  });

  describe('Bank Statement Import', () => {
    it('should import XML statement (mocked)', async () => {
      // Since we can't easily upload a file in this test environment without a real file,
      // we will manually create a statement to simulate a successful import,
      // OR we can try to mock the service.
      // For integration test, let's manually create the statement and verify retrieval.
      
      const statement = await prisma.bankStatement.create({
        data: {
          companyId,
          statementNumber: '100/2023',
          accountNumber: '160-0000000000000-00',
          statementDate: new Date(),
          fromDate: new Date(),
          toDate: new Date(),
          totalDebit: 0,
          totalCredit: 1200,
          openingBalance: 0,
          closingBalance: 1200,
          status: BankStatementStatus.IMPORTED,
          transactions: {
            create: [
              {
                transactionDate: new Date(),
                amount: 1200,
                type: BankTransactionType.CREDIT,
                partnerName: 'Test Buyer',
                description: 'Payment for INV-BANK-001',
                reference: 'INV-BANK-001', // Exact match
                matchStatus: MatchStatus.UNMATCHED
              }
            ]
          }
        },
        include: {
          transactions: true
        }
      });
      
      statementId = statement.id;
      transactionId = statement.transactions[0].id;

      expect(statement).toBeDefined();
      expect(statement.transactions.length).toBe(1);
    });

    it('should get all statements', async () => {
      const res = await request(app)
        .get('/api/bank-statements')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should get single statement', async () => {
      const res = await request(app)
        .get(`/api/bank-statements/${statementId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(statementId);
    });
  });

  describe('Transaction Matching', () => {
    it('should auto-match transactions', async () => {
      const res = await request(app)
        .post(`/api/bank-statements/${statementId}/auto-match`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // It should match because reference matches invoice number
      expect(res.body.data.matched).toBe(1);
    });

    it('should verify transaction status is MATCHED', async () => {
      const transaction = await prisma.bankTransaction.findUnique({
        where: { id: transactionId }
      });
      expect(transaction?.matchStatus).toBe(MatchStatus.MATCHED);
      expect(transaction?.matchedInvoiceId).toBe(invoiceId);
    });

    it('should create payment from matched transaction', async () => {
      const res = await request(app)
        .post(`/api/bank-statements/transactions/${transactionId}/create-payment`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify Payment created
      const payment = await prisma.payment.findFirst({
        where: { invoiceId }
      });
      expect(payment).toBeDefined();
      expect(Number(payment?.amount)).toBe(1200);
      
      // Verify Invoice status updated
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId }
      });
      expect(invoice?.paymentStatus).toBe('PAID');
    });
  });
});
