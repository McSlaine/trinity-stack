require('dotenv').config();

module.exports = {
  apps: [{
    name: 'cashflow-ai-dev',
    script: './server.js',
    
    // Development configuration
    exec_mode: 'fork', // Single instance for easier debugging
    instances: 1,
    
    // File watching for auto-restart during development
    watch: true,
    ignore_watch: [
      "node_modules", 
      "dist", 
      ".git", 
      "*.log", 
      ".env.*",
      "crash.log",
      "server.log",
      "vectors/",
      "tokenStore/"
    ],
    
    // Environment variables (loaded from .env)
    env: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || 3000,
    },
    
    // Development logging and monitoring
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    
    // Auto-restart settings for development
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 2000,
    
    // Development-friendly settings
    kill_timeout: 3000,
    listen_timeout: 8000,
    
    // Disable clustering features for development
    merge_logs: true,
    combine_logs: true,
    
    // Development flags
    env_development: {
      NODE_ENV: 'development',
      DEBUG_OAUTH: 'true',
      DEBUG_TOKEN_REFRESH: 'true',
      TOKENSTORE_LOGGING: 'true'
    }
  }]
};