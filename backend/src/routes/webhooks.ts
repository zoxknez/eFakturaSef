import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../db/prisma';
declare global {
  // eslint-disable-next-line no-var
  var __sefWebhookIdem: Map<string, number> | undefined;
}

const router = Router();

// We need raw body for signature verification; mount a sub-router with express.raw
import express from 'express';
const rawJson = express.raw({ type: '*/*' });

// Very simple HMAC validation: X-SEF-Signature: sha256=hexdigest
function verifySignature(rawBody: Buffer, signature: string | undefined, secret: string): boolean {
  if (!signature) return false;
  const [algo, provided] = signature.split('=');
  if (algo !== 'sha256' || !provided) return false;
  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  // timing-safe compare
  const a = Buffer.from(hmac, 'hex');
  const b = Buffer.from(provided, 'hex');
  if (a.length !== b.length) return false;
  try {
    if (crypto.timingSafeEqual(a, b)) return true;
  } catch {
    // ignore and fallback
  }
  // fallback: case-insensitive string compare
  return hmac.toLowerCase() === provided.toLowerCase();
}

router.post('/sef', rawJson, (req, res) => {
  const secret = process.env.SEF_WEBHOOK_SECRET || '';
  if (!secret) {
    return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
  }

  const sig = req.header('X-SEF-Signature') || req.header('x-sef-signature') || '';
  const raw = (req as any).body as Buffer; // because of express.raw

  // primary check on raw body
  let ok = verifySignature(raw, sig, secret);
  let payload: any;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    // If JSON invalid, and raw signature failed, reject
    if (!ok) return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }

  // fallback: if raw check failed but JSON is parseable, try canonical JSON
  if (!ok && payload !== undefined) {
    const canonical = Buffer.from(JSON.stringify(payload));
    ok = verifySignature(canonical, sig, secret);
  }

  if (!ok) {
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }

  // Idempotency: use signature as key; additionally compute digest
  const idempotencyKey = sig;
  const now = Date.now();
  const ttlMs = 10 * 60 * 1000; // 10 minutes
    if (!(global as any).__sefWebhookIdem) {
      (global as any).__sefWebhookIdem = new Map<string, number>();
    }
    const idemMap: Map<string, number> = (global as any).__sefWebhookIdem;
  const prev = idemMap.get(idempotencyKey);
  if (prev && now - prev < ttlMs) {
    return res.status(200).json({ success: true, message: 'Webhook received (idempotent)' });
  }
  idemMap.set(idempotencyKey, now);

  // Best-effort DB log (non-blocking behavior if fails)
  (async () => {
    try {
      const eventType = payload?.type ?? 'unknown';
      const sefId = payload?.id ?? payload?.sefId ?? '';
      const json = JSON.stringify(payload ?? {});
      // Check if same signature already logged
      const existing = await (prisma as any).sEFWebhookLog.findFirst({ where: { signature: idempotencyKey } });
      if (!existing) {
        await (prisma as any).sEFWebhookLog.create({
          data: {
            eventType,
            sefId,
            payload: json,
            signature: idempotencyKey,
            processed: false
          }
        });
      }
    } catch {
      // ignore logging errors
    }
  })();

  // Acknowledge
  return res.status(200).json({ success: true, message: 'Webhook received', data: { type: payload?.type || 'unknown' } });
});

export default router;
