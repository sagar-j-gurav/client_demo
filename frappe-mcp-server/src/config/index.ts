/**
 * Configuration Manager
 * Loads the appropriate configuration based on NODE_ENV
 */

export type Environment = 'dev' | 'uat' | 'prod';

// Import config functions instead of exported objects
// This allows environment variables to be evaluated lazily
const getDevConfig = () => {
  return {
    environment: 'dev' as const,
    frappe: {
      apiUrl: process.env.FRAPPE_API_URL || 'http://localhost:8000',
      apiKey: process.env.FRAPPE_API_KEY || '',
      apiSecret: process.env.FRAPPE_API_SECRET || '',
    },
    http: {
      enabled: true,
      port: parseInt(process.env.HTTP_PORT || '3000'),
      host: process.env.HTTP_HOST || 'localhost',
    },
    logging: {
      level: 'debug' as const,
      enabled: true,
    },
  };
};

const getUatConfig = () => {
  return {
    environment: 'uat' as const,
    frappe: {
      apiUrl: process.env.FRAPPE_API_URL || 'http://localhost:8000',
      apiKey: process.env.FRAPPE_API_KEY || '',
      apiSecret: process.env.FRAPPE_API_SECRET || '',
    },
    http: {
      enabled: true,
      port: parseInt(process.env.HTTP_PORT || '3001'),
      host: process.env.HTTP_HOST || 'localhost',
    },
    logging: {
      level: 'info' as const,
      enabled: true,
    },
  };
};

const getProdConfig = () => {
  return {
    environment: 'prod' as const,
    frappe: {
      apiUrl: process.env.FRAPPE_API_URL || 'http://localhost:8000',
      apiKey: process.env.FRAPPE_API_KEY || '',
      apiSecret: process.env.FRAPPE_API_SECRET || '',
    },
    http: {
      enabled: true,
      port: parseInt(process.env.HTTP_PORT || '3000'),
      host: process.env.HTTP_HOST || '0.0.0.0',
    },
    logging: {
      level: 'warn' as const,
      enabled: true,
    },
  };
};

export type Config = 
  | ReturnType<typeof getDevConfig>
  | ReturnType<typeof getUatConfig>
  | ReturnType<typeof getProdConfig>;

/**
 * Get configuration based on NODE_ENV
 * Called after dotenv.config() to ensure env vars are loaded
 */
export function getConfig(): Config {
  const env = (process.env.NODE_ENV || 'dev') as Environment;

  switch (env) {
    case 'uat':
      return getUatConfig();
    case 'prod':
      return getProdConfig();
    case 'dev':
    default:
      return getDevConfig();
  }
}
