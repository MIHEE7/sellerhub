require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./config/db');

const authRouter = require('./routes/auth');
const accountsRouter = require('./routes/accounts');
const notificationsRouter = require('./routes/notifications');
const settingsRouter = require('./routes/settings');
const integrationsRouter = require('./routes/integrations');
const ordersRouter = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

async function initDb() {
  await db.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      recovery_email VARCHAR(255),
      recovery_email_updated_at TIMESTAMP,
      reset_password_token TEXT,
      reset_password_expires_at TIMESTAMP,
      fcm_token TEXT,
      kakao_phone VARCHAR(255),
      notify_email VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      push_enabled BOOLEAN NOT NULL DEFAULT true,
      kakao_enabled BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS integrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      platform VARCHAR(50) NOT NULL,
      account_name VARCHAR(100) NOT NULL,
      client_id TEXT,
      client_secret TEXT,
      access_key TEXT,
      secret_key TEXT,
      vendor_id TEXT,
      extra JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS integrations_platform_account_name_uidx
    ON integrations(platform, account_name);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      platform VARCHAR(50) NOT NULL,
      integration_id UUID,
      external_order_id VARCHAR(255) NOT NULL,
      order_status VARCHAR(100),
      order_date TIMESTAMP,
      buyer_name VARCHAR(255),
      buyer_phone VARCHAR(255),
      receiver_name VARCHAR(255),
      receiver_phone VARCHAR(255),
      product_name TEXT,
      sku VARCHAR(255),
      quantity INTEGER DEFAULT 1,
      amount NUMERIC(14,2) DEFAULT 0,
      raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(platform, external_order_id)
    );
  `);

  console.log('✅ DB tables initialized');
}

app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/orders', ordersRouter);

app.use((req, res) => {
  res.status(404).json({
    error: '요청한 API를 찾을 수 없습니다.',
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error('[API ERROR]', err);

  res.status(err.status || 500).json({
    error: err.message || '서버 오류가 발생했습니다.',
  });
});

(async () => {
  try {
    await initDb();

    app.listen(PORT, () => {
      console.log(`✅ API server running on http://localhost:${PORT}`);
    });

    try {
      const { startScheduler } = require('./scheduler');
      if (typeof startScheduler === 'function') {
        startScheduler();
      }
    } catch (e) {
      console.log('[Scheduler] 별도 scheduler 파일이 없거나 시작되지 않았습니다.');
    }
  } catch (err) {
    console.error('❌ DB init failed', err);
    process.exit(1);
  }
})();