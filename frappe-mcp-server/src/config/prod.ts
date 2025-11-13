/**
 * Production Environment Configuration
 */

export const prodConfig = {
  environment: 'prod' as const,
  frappe: {
    apiUrl: process.env.FRAPPE_API_URL || '',
    apiKey: process.env.FRAPPE_API_KEY || '',
    apiSecret: process.env.FRAPPE_API_SECRET || '',
  },
  http: {
    enabled: true, // HTTP enabled for production
    port: parseInt(process.env.HTTP_PORT || '3002'),
    host: process.env.HTTP_HOST || '0.0.0.0',
  },
  logging: {
    level: 'error' as const,
    enabled: true,
  },
  pm2: {
    enabled: true,
    instances: 4,
    maxMemoryRestart: '1G',
  },
};
