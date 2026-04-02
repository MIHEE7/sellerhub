const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

(async () => {
  try {
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        platform VARCHAR(50),
        account_name VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        platform VARCHAR(50),
        external_order_id VARCHAR(255)
      );
    `);

    console.log('🔥 DB FORCE INIT DONE');
  } catch (err) {
    console.error('DB INIT ERROR:', err);
  }
})();

module.exports = pool;