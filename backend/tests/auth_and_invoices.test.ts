import request from 'supertest';
import app from '../src/index';

describe('Auth + Invoices flow', () => {
  let token: string = '';

  it('should login with demo admin user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@democompany.rs', password: 'demo123' });

    expect(res.status).toBe(200);
    expect(res.body?.data?.token).toBeTruthy();
    token = res.body.data.token;
  });

  it('should list invoices with auth', async () => {
    const res = await request(app)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(Array.isArray(res.body?.data)).toBe(true);
  });
});
