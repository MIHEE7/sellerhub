const db = require('./config/db');
const { collectOrdersForIntegration } = require('./services/orderCollectors');

function startScheduler() {
  const minutes = Number(process.env.POLL_INTERVAL_MINUTES || 5);
  console.log(`[Scheduler] 시작 — 폴링 주기: ${minutes}분`);

  setInterval(async () => {
    try {
      const { rows: integrations } = await db.query(
        `
        SELECT *
        FROM integrations
        WHERE is_active = true
        ORDER BY platform ASC, account_name ASC
        `
      );

      for (const integration of integrations) {
        try {
          const result = await collectOrdersForIntegration({ db, integration });
          console.log('[Scheduler] collect result', {
            platform: integration.platform,
            account_name: integration.account_name,
            result,
          });
        } catch (err) {
          console.error('[Scheduler] collect error', {
            platform: integration.platform,
            account_name: integration.account_name,
            error: err.message,
          });
        }
      }
    } catch (err) {
      console.error('[Scheduler] loop error', err.message);
    }
  }, minutes * 60 * 1000);
}

module.exports = { startScheduler };