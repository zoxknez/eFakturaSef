import request from 'supertest';
import app from '../index';
import { prisma } from '../db/prisma';
import bcrypt from 'bcryptjs';
import { closeAllQueues } from '../queue';

describe('Authentication', () => {
  // Use unique identifiers for this test suite
  const TEST_PIB = '123456789';
  const TEST_EMAIL = 'auth_test@example.com';
  
  // Helper to clean up test data
  const cleanup = async () => {
    try {
      const company = await prisma.company.findFirst({ where: { pib: TEST_PIB } });
      if (company) {
        await prisma.user.deleteMany({ where: { companyId: company.id } });
        await prisma.company.delete({ where: { id: company.id } });
      }
    } catch (error) {
      console.log('Cleanup error (ignoring):', error);
    }
  };

  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await closeAllQueues();
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // First create a company
      const company = await prisma.company.create({
        data: {
          pib: TEST_PIB,
          name: 'Test Company',
          address: 'Test Address',
          city: 'Test City',
          postalCode: '11000',
          country: 'RS'
        }
      });

      const userData = {
        email: TEST_EMAIL,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        companyId: company.id
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      if (response.status !== 201) {
        console.log('Register failed:', response.status, response.body);
      }
      
      expect(response.status).toBe(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.firstName).toBe(userData.firstName);
      expect(response.body.data.user.lastName).toBe(userData.lastName);
    });

    it('should fail with invalid email', async () => {
      const company = await prisma.company.create({
        data: {
          pib: TEST_PIB,
          name: 'Test Company',
          address: 'Test Address',
          city: 'Test City',
          postalCode: '11000',
          country: 'RS'
        }
      });

      const userData = {
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        companyId: company.id
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should fail with weak password', async () => {
      const company = await prisma.company.create({
        data: {
          pib: TEST_PIB,
          name: 'Test Company',
          address: 'Test Address',
          city: 'Test City',
          postalCode: '11000',
          country: 'RS'
        }
      });

      const userData = {
        email: TEST_EMAIL,
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        companyId: company.id
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test company and user
      console.log('Creating company...');
      const company = await prisma.company.create({
        data: {
          pib: TEST_PIB,
          name: 'Test Company',
          address: 'Test Address',
          city: 'Test City',
          postalCode: '11000',
          country: 'RS'
        }
      });
      console.log('Company created:', company.id);

      const hashedPassword = await bcrypt.hash('Password123!', 12);
      console.log('Creating user for company:', company.id);
      await prisma.user.create({
        data: {
          email: TEST_EMAIL,
          password: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          role: 'OPERATOR',
          companyId: company.id
        }
      });
      console.log('User created');
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_EMAIL,
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe(TEST_EMAIL);
    });

    it('should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_EMAIL,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const company = await prisma.company.create({
        data: {
          pib: TEST_PIB,
          name: 'Test Company',
          address: 'Test Address',
          city: 'Test City',
          postalCode: '11000',
          country: 'RS'
        }
      });

      const hashedPassword = await bcrypt.hash('Password123!', 12);
      await prisma.user.create({
        data: {
          email: TEST_EMAIL,
          password: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          role: 'OPERATOR',
          companyId: company.id
        }
      });

      // Login to get refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_EMAIL,
          password: 'Password123!'
        });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid refresh token');
    });
  });
});
