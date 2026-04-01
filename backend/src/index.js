require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

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

app.listen(PORT, () => {
  console.log(`✅  API server running on http://localhost:${PORT}`);
});

try {
  const { startScheduler } = require('./scheduler');
  if (typeof startScheduler === 'function') {
    startScheduler();
  }
} catch (e) {
  console.log('[Scheduler] 별도 scheduler 파일이 없거나 시작되지 않았습니다.');
}