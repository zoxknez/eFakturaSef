// Configuration and feature flags API
import express, { Request, Response } from 'express';
import { getFeatureFlagsForClient } from '../config/featureFlags';
import { getEnvironmentConfig } from '../config/environments';

const router = express.Router();

/**
 * GET /config/features
 * Get enabled feature flags for client
 */
router.get('/features', (req: Request, res: Response) => {
  try {
    const features = getFeatureFlagsForClient();
    
    res.json({
      success: true,
      features,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to get feature flags',
    });
  }
});

/**
 * GET /config/environment
 * Get environment information (public data only)
 */
router.get('/environment', (req: Request, res: Response) => {
  try {
    const env = getEnvironmentConfig();
    
    // Only expose non-sensitive config
    res.json({
      success: true,
      environment: {
        name: env.name,
        apiUrl: env.apiUrl,
        frontendUrl: env.frontendUrl,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to get environment config',
    });
  }
});

export default router;

