// Monitoring and alerting routes
import express, { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { captureMessage } from '../utils/sentry';

const router = express.Router();

/**
 * POST /monitoring/alert
 * Receive alerts from monitoring systems (e.g., Prometheus Alertmanager)
 */
router.post('/alert', async (req: Request, res: Response) => {
  try {
    const alerts = req.body.alerts || [];
    
    logger.warn('Monitoring alert received', {
      type: 'monitoring_alert',
      alertCount: alerts.length,
      alerts,
    });

    // Process each alert
    for (const alert of alerts) {
      const { status, labels, annotations } = alert;
      
      logger.warn('Alert details', {
        type: 'alert',
        status,
        alertname: labels?.alertname,
        severity: labels?.severity,
        summary: annotations?.summary,
        description: annotations?.description,
      });

      // Send critical alerts to Sentry
      if (labels?.severity === 'critical') {
        captureMessage(
          `Critical Alert: ${labels?.alertname} - ${annotations?.summary}`,
          'error'
        );
      }
    }

    res.json({ success: true, processed: alerts.length });
  } catch (error: any) {
    logger.error('Failed to process monitoring alert', {
      error: error.message,
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /monitoring/status
 * Get monitoring status summary
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    res.json(status);
  } catch (error: any) {
    logger.error('Failed to get monitoring status', {
      error: error.message,
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

