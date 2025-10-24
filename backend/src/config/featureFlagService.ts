// Feature flag service with remote config support
import { getFeatureFlags, FeatureFlags } from './featureFlags';
import { logger } from '../utils/logger';

// In-memory cache for feature flags
let cachedFlags: FeatureFlags | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Fetch feature flags from remote config (optional)
 * This can be integrated with services like LaunchDarkly, ConfigCat, etc.
 */
async function fetchRemoteFlags(): Promise<FeatureFlags | null> {
  try {
    // TODO: Implement remote feature flag fetching
    // Example: Fetch from LaunchDarkly, ConfigCat, or custom API
    
    // For now, return null (use local flags)
    return null;
  } catch (error: any) {
    logger.error('Failed to fetch remote feature flags', {
      error: error.message,
    });
    return null;
  }
}

/**
 * Get feature flags with caching
 */
export async function getFlags(): Promise<FeatureFlags> {
  const now = Date.now();
  
  // Return cached flags if still valid
  if (cachedFlags && now - lastFetchTime < CACHE_TTL) {
    return cachedFlags;
  }
  
  // Try to fetch remote flags
  const remoteFlags = await fetchRemoteFlags();
  
  if (remoteFlags) {
    cachedFlags = remoteFlags;
    lastFetchTime = now;
    logger.debug('Feature flags updated from remote config');
    return remoteFlags;
  }
  
  // Fallback to local flags
  const localFlags = getFeatureFlags();
  cachedFlags = localFlags;
  lastFetchTime = now;
  
  return localFlags;
}

/**
 * Check if feature is enabled (async version with remote support)
 */
export async function isEnabled(feature: keyof FeatureFlags): Promise<boolean> {
  const flags = await getFlags();
  return flags[feature];
}

/**
 * Invalidate cache (force refresh on next request)
 */
export function invalidateCache(): void {
  cachedFlags = null;
  lastFetchTime = 0;
  logger.info('Feature flags cache invalidated');
}

/**
 * Override feature flag (for testing)
 */
const overrides = new Map<keyof FeatureFlags, boolean>();

export function overrideFeature(feature: keyof FeatureFlags, value: boolean): void {
  overrides.set(feature, value);
  logger.warn('Feature flag overridden', { feature, value });
}

export function clearOverride(feature: keyof FeatureFlags): void {
  overrides.delete(feature);
  logger.info('Feature flag override cleared', { feature });
}

export function clearAllOverrides(): void {
  overrides.clear();
  logger.info('All feature flag overrides cleared');
}

/**
 * Get effective feature value (with overrides)
 */
export async function getEffectiveFeature(feature: keyof FeatureFlags): Promise<boolean> {
  // Check override first
  if (overrides.has(feature)) {
    return overrides.get(feature)!;
  }
  
  // Check flags
  return await isEnabled(feature);
}

/**
 * Feature flag metrics for monitoring
 */
export function getFeatureFlagMetrics() {
  const flags = getFeatureFlags();
  const enabledCount = Object.values(flags).filter(Boolean).length;
  const totalCount = Object.keys(flags).length;
  
  return {
    total: totalCount,
    enabled: enabledCount,
    disabled: totalCount - enabledCount,
    enabledPercentage: (enabledCount / totalCount) * 100,
    overrides: Array.from(overrides.entries()).map(([feature, value]) => ({
      feature,
      value,
    })),
  };
}

export default {
  getFlags,
  isEnabled,
  invalidateCache,
  overrideFeature,
  clearOverride,
  clearAllOverrides,
  getEffectiveFeature,
  getFeatureFlagMetrics,
};

