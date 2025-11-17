const logger = require('../utils/logger');

function validateEnv() {
  const required = [
    'JWT_SECRET',
    'ADMIN_PASSWORD',
    'CREATOR_PASSWORD',
    'DB_MODE'
  ];
  
  if (process.env.DB_MODE === 'POSTGRES') {
    required.push('DB_HOST_PG');
  } else if (process.env.DB_MODE === 'MYSQL') {
    required.push('DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME');
  }
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.error(`❌ Missing environment variables: ${missing.join(', ')}`);
    console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  if (process.env.JWT_SECRET.length < 32) {
    logger.error('❌ JWT_SECRET must be at least 32 characters');
    console.error('❌ JWT_SECRET must be at least 32 characters');
    process.exit(1);
  }
  
  logger.info('✅ Environment variables validated');
}

module.exports = { validateEnv };
