import express from 'express';
import crypto from 'crypto';
import { config } from '../config';

const router = express.Router();

// @route   POST /api/sef/webhook
// @desc    Handle SEF webhook callbacks
// @access  Public (but verified)
router.post('/webhook', (req, res) => {
  try {
    const signature = req.get('X-SEF-Signature');
    const payload = JSON.stringify(req.body);
    
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', config.WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    
    if (signature !== `sha256=${expectedSignature}`) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    // Process webhook payload
    console.log('SEF Webhook received:', req.body);
    
    // Here you would typically:
    // 1. Update invoice status in database
    // 2. Send notifications
    // 3. Trigger business logic

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
});

// @route   GET /api/sef/status
// @desc    Check SEF API status
// @access  Private
router.get('/status', (req, res) => {
  // Mock SEF status check
  res.json({
    success: true,
    data: {
      status: 'online',
      environment: 'demo',
      lastCheck: new Date().toISOString(),
      nightPause: false
    }
  });
});

export default router;