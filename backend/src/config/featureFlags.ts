// Feature flags for gradual rollout and A/B testing
import { getEnvironment } from './environments';

export interface FeatureFlags {
  // Bull Queue features
  enableBullQueue: boolean;
  enableNightPause: boolean;
  
  // Advanced features
  enableIdempotency: boolean;
  enableAdvancedRateLimiting: boolean;
  enableCaching: boolean;
  
  // Monitoring features
  enablePrometheusMetrics: boolean;
  enableSentryTracking: boolean;
  enableAuditLogging: boolean;
  
  // SEF features
  enableSEFWebhooks: boolean;
  enableSEFStatusPolling: boolean;
  
  // Experimental features
  enableBulkOperations: boolean;
  enableFileAttachments: boolean;
  enableNotifications: boolean;
  enableExports: boolean;
  
  // UI features
  enableDarkMode: boolean;
  enableCharts: boolean;
  enableAdvancedFilters: boolean;
}

/**
 * Default feature flags by environment
 */
const featureFlagsByEnvironment: Record<string, FeatureFlags> = {
  development: {
    // Core features - always on in dev
    enableBullQueue: true,
    enableNightPause: false, // Disabled in dev for testing
    
    // Advanced features - always on in dev
    enableIdempotency: true,
    enableAdvancedRateLimiting: true,
    enableCaching: true,
    
    // Monitoring - enabled in dev
    enablePrometheusMetrics: true,
    enableSentryTracking: false, // Disabled to avoid noise
    enableAuditLogging: true,
    
    // SEF features
    enableSEFWebhooks: true,
    enableSEFStatusPolling: true,
    
    // Experimental features - enabled in dev for testing
    enableBulkOperations: true,
    enableFileAttachments: true,
    enableNotifications: true,
    enableExports: true,
    
    // UI features - all enabled in dev
    enableDarkMode: true,
    enableCharts: true,
    enableAdvancedFilters: true,
  },

  staging: {
    // Core features
    enableBullQueue: true,
    enableNightPause: true,
    
    // Advanced features
    enableIdempotency: true,
    enableAdvancedRateLimiting: true,
    enableCaching: true,
    
    // Monitoring - full monitoring in staging
    enablePrometheusMetrics: true,
    enableSentryTracking: true,
    enableAuditLogging: true,
    
    // SEF features
    enableSEFWebhooks: true,
    enableSEFStatusPolling: true,
    
    // Experimental features - test in staging first
    enableBulkOperations: true,
    enableFileAttachments: false, // Not ready yet
    enableNotifications: true,
    enableExports: true,
    
    // UI features
    enableDarkMode: true,
    enableCharts: true,
    enableAdvancedFilters: true,
  },

  production: {
    // Core features
    enableBullQueue: true,
    enableNightPause: true,
    
    // Advanced features
    enableIdempotency: true,
    enableAdvancedRateLimiting: true,
    enableCaching: true,
    
    // Monitoring
    enablePrometheusMetrics: true,
    enableSentryTracking: true,
    enableAuditLogging: true,
    
    // SEF features
    enableSEFWebhooks: true,
    enableSEFStatusPolling: true,
    
    // Experimental features - gradual rollout
    enableBulkOperations: false, // Not ready for production
    enableFileAttachments: false, // Not ready for production
    enableNotifications: false, // Phase 2
    enableExports: false, // Phase 2
    
    // UI features
    enableDarkMode: true,
    enableCharts: true,
    enableAdvancedFilters: true,
  },
};

/**
 * Get feature flags for current environment
 */
export function getFeatureFlags(): FeatureFlags {
  const environment = getEnvironment();
  return featureFlagsByEnvironment[environment] || featureFlagsByEnvironment.development;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature];
}

/**
 * Feature flag middleware
 * Returns 404 if feature is not enabled
 */
export function requireFeature(feature: keyof FeatureFlags) {
  return (req: any, res: any, next: any) => {
    if (!isFeatureEnabled(feature)) {
      return res.status(404).json({
        success: false,
        error: 'Feature not available',
      });
    }
    next();
  };
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): string[] {
  const flags = getFeatureFlags();
  return Object.entries(flags)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature);
}

/**
 * Feature flag API endpoint response
 */
export function getFeatureFlagsForClient() {
  const flags = getFeatureFlags();
  
  // Only expose UI-related flags to client
  return {
    enableDarkMode: flags.enableDarkMode,
    enableCharts: flags.enableCharts,
    enableAdvancedFilters: flags.enableAdvancedFilters,
    enableBulkOperations: flags.enableBulkOperations,
    enableFileAttachments: flags.enableFileAttachments,
    enableNotifications: flags.enableNotifications,
    enableExports: flags.enableExports,
  };
}

