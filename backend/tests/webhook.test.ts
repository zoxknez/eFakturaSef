import request from 'supertest';
import crypto from 'crypto';
import app from '../src';

function sign(body: any, secret: string) {
  const json = JSON.stringify(body);
  const hmac = crypto.createHmac('sha256', secret).update(json).digest('hex');
  return { json, sig: `sha256=${hmac}` };
}

describe('SEF webhook', () => {
  const secret = 'test-secret';
  const old = process.env.SEF_WEBHOOK_SECRET;
  beforeAll(() => {
    process.env.SEF_WEBHOOK_SECRET = secret;
  });
  afterAll(() => {
    if (old !== undefined) process.env.SEF_WEBHOOK_SECRET = old;
    else delete process.env.SEF_WEBHOOK_SECRET;
  });

  it('rejects when no secret configured', async () => {
    delete process.env.SEF_WEBHOOK_SECRET;
    const res = await request(app)
      .post('/api/webhooks/sef')
      .set('Content-Type', 'application/json')
      .send({ hello: 'world' });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('rejects invalid signature', async () => {
    process.env.SEF_WEBHOOK_SECRET = secret;
    const res = await request(app)
      .post('/api/webhooks/sef')
      .set('Content-Type', 'application/json')
      .set('X-SEF-Signature', 'sha256=deadbeef')
      .send({ hello: 'world' });
    expect(res.status).toBe(401);
  });

  it('accepts valid signature', async () => {
    const payload = { type: 'invoice.status.changed', id: 'abc' };
    const { json, sig } = sign(payload, secret);
    const res = await request(app)
      .post('/api/webhooks/sef')
      .set('X-SEF-Signature', sig)
      .set('Content-Type', 'application/json')
      .send(json);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
