// Environment-specific configurations
export const environments = {
  development: {
    name: 'development',
    apiUrl: 'http://localhost:3001',
    frontendUrl: 'http://localhost:3000',
    sefApiUrl: 'https://demoefaktura.mfin.gov.rs',
    logLevel: 'debug',
    enableDebugTools: true,
    enableMetrics: true,
    enableSentry: false,
  },
  
  staging: {
    name: 'staging',
    apiUrl: process.env.STAGING_API_URL || 'https://staging-api.sef-efakture.com',
    frontendUrl: process.env.STAGING_FRONTEND_URL || 'https://staging.sef-efakture.com',
    sefApiUrl: 'https://demoefaktura.mfin.gov.rs',
    logLevel: 'info',
    enableDebugTools: true,
    enableMetrics: true,
    enableSentry: true,
  },
  
  production: {
    name: 'production',
    apiUrl: process.env.PROD_API_URL || 'https://api.sef-efakture.com',
    frontendUrl: process.env.PROD_FRONTEND_URL || 'https://sef-efakture.com',
    sefApiUrl: 'https://efaktura.mfin.gov.rs',
    logLevel: 'info',
    enableDebugTools: false,
    enableMetrics: true,
    enableSentry: true,
  },
};

export type Environment = keyof typeof environments;

export function getEnvironment(): Environment {
  const env = (process.env.NODE_ENV || 'development') as Environment;
  return environments[env] ? env : 'development';
}

export function getEnvironmentConfig() {
  return environments[getEnvironment()];
}

