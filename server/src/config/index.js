const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'scentwise',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    rateLimitRPM: parseInt(process.env.GEMINI_RATE_LIMIT_RPM, 10) || 15,
    timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS, 10) || 10000,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Recommendation engine weights — configurable centrally
  recommendation: {
    weights: {
      fragranceFamily: 0.30,
      fragranceNotes: 0.10,
      occasion: 0.20,
      season: 0.15,
      budget: 0.10,
      timeOfDay: 0.05,
      intensity: 0.05,
      gender: 0.05,
    },
    maxResults: 20,
    minScore: 10,
  },
};

// Validate weights sum to 1.0
const weightSum = Object.values(config.recommendation.weights).reduce((a, b) => a + b, 0);
if (Math.abs(weightSum - 1.0) > 0.001) {
  console.warn(`⚠️  Recommendation weights sum to ${weightSum}, expected 1.0. Adjust weights in config.`);
}

module.exports = config;
