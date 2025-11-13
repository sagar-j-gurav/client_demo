/**
 * PM2 Ecosystem Configuration
 * Manages UAT and Production deployments
 */

module.exports = {
  apps: [
    {
      name: 'frappe-mcp-uat',
      script: 'dist/http-server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'uat',
        HTTP_PORT: 3001,
        HTTP_HOST: '0.0.0.0',
      },
      max_memory_restart: '500M',
      error_file: './logs/uat-error.log',
      out_file: './logs/uat-out.log',
      log_file: './logs/uat-combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000,
    },
    {
      name: 'frappe-mcp-prod',
      script: 'dist/http-server.js',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'prod',
        HTTP_PORT: 3002,
        HTTP_HOST: '0.0.0.0',
      },
      max_memory_restart: '1G',
      error_file: './logs/prod-error.log',
      out_file: './logs/prod-out.log',
      log_file: './logs/prod-combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000,
    },
  ],
};
