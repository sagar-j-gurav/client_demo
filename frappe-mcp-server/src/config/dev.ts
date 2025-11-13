/**
 * Development Environment Configuration
 */

export const devConfig = {
  environment: 'dev' as const,
  frappe: {
    apiUrl: process.env.FRAPPE_API_URL || 'http://localhost:8000',
    apiKey: process.env.FRAPPE_API_KEY || '',
    apiSecret: process.env.FRAPPE_API_SECRET || '',
  },
  http: {
    enabled: true, // HTTP enabled for Streamable HTTP transport
    port: parseInt(process.env.HTTP_PORT || '3000'),
    host: process.env.HTTP_HOST || 'localhost',
  },
  logging: {
    level: 'debug' as const,
    enabled: true,
  },
};
