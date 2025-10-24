import request from 'supertest';
import app from '../index';
import { prisma } from '../db/prisma';
import bcrypt from 'bcryptjs';

describe('Authentication', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany();
    await prisma.company.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // First create a company
      const company = await prisma.company.create({
        data: {
          pib: '123456789',
          name: 'Test Company',
          address: 'Test Address',
          city: 'Test City',
          postalCode: '11000',
          country: 'RS'
        }
      });

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        companyId: company.id
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.firstName).toBe(userData.firstName);
      expect(response.body.data.user.lastName).toBe(userData.lastName);
    });

    it('should fail with invalid email', async () => {
      const company = await prisma.company.create({
        data: {
          pib: '123456789',
          name: 'Test Company',
          address: 'Test Address',
          city: 'Test City',
          postalCode: '11000',
          country: 'RS'
        }
      });

      const userData = {
        email: 'invalid-email',
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
      expect(response.body.error).toBe('Validation failed');
    });

    it('should fail with weak password', async () => {
      const company = await prisma.company.create({
        data: {
          pib: '123456789',
          name: 'Test Company',
          address: 'Test Address',
          city: 'Test City',
          postalCode: '11000',
          country: 'RS'
        }
      });

      const userData = {
        email: 'test@example.com',
        password: '123',
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
      const company = await prisma.company.create({
        data: {
          pib: '123456789',
          name: 'Test Company',
          address: 'Test Address',
          city: 'Test City',
          postalCode: '11000',
          country: 'RS'
        }
      });

      const hashedPassword = await bcrypt.hash('password123', 12);
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          role: 'OPERATOR',
          companyId: company.id
        }
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
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
          password: 'password123'
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
          pib: '123456789',
          name: 'Test Company',
          address: 'Test Address',
          city: 'Test City',
          postalCode: '11000',
          country: 'RS'
        }
      });

      const hashedPassword = await bcrypt.hash('password123', 12);
      await prisma.user.create({
        data: {
          email: 'test@example.com',
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
          email: 'test@example.com',
          password: 'password123'
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
      expect(response.body.data.user.email).toBe('test@example.com');
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
