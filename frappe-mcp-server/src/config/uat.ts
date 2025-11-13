/**
 * UAT Environment Configuration
 */

export const uatConfig = {
  environment: 'uat' as const,
  frappe: {
    apiUrl: process.env.FRAPPE_API_URL || '',
    apiKey: process.env.FRAPPE_API_KEY || '',
    apiSecret: process.env.FRAPPE_API_SECRET || '',
  },
  http: {
    enabled: true, // HTTP enabled for UAT
    port: parseInt(process.env.HTTP_PORT || '3001'),
    host: process.env.HTTP_HOST || '0.0.0.0',
  },
  logging: {
    level: 'info' as const,
    enabled: true,
  },
  pm2: {
    enabled: true,
    instances: 2,
    maxMemoryRestart: '500M',
  },
};
