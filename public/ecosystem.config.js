module.exports = { 
  apps: [{ 
    name: 'cashflow-ai', 
    script: './server.js', 
    instances: 'max', 
    exec_mode: 'cluster', 
    env: { 
      NODE_ENV: 'production', 
      PORT: 3000
    } 
  }] 
}; 