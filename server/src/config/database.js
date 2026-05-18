const { Pool } = require('pg');
const config = require('./index');
const logger = require('../utils/logger');

const pool = new Pool(config.db);

pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
  process.exit(-1);
});

/**
 * Execute a parameterized SQL query.
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<object>} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Query executed in ${duration}ms — rows: ${result.rowCount}`);
    return result;
  } catch (error) {
    logger.error(`Query error: ${error.message}`, { query: text, params });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions.
 * @returns {Promise<object>} Pool client
 */
const getClient = async () => {
  const client = await pool.connect();
  return client;
};

module.exports = { pool, query, getClient };
