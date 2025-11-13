/**
 * Configuration Manager
 * Loads the appropriate configuration based on NODE_ENV
 */

import { devConfig } from './dev.js';
import { uatConfig } from './uat.js';
import { prodConfig } from './prod.js';

export type Environment = 'dev' | 'uat' | 'prod';

export type Config = typeof devConfig | typeof uatConfig | typeof prodConfig;

/**
 * Get configuration based on NODE_ENV
 */
export function getConfig(): Config {
  const env = (process.env.NODE_ENV || 'dev') as Environment;

  switch (env) {
    case 'uat':
      return uatConfig;
    case 'prod':
      return prodConfig;
    case 'dev':
    default:
      return devConfig;
  }
}

export const config = getConfig();

// Export individual configs for direct access if needed
export { devConfig, uatConfig, prodConfig };
