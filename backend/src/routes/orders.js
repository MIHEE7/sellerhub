const router = require('express').Router();
const db = require('../config/db');
const authMw = require('../middleware/auth');
const { collectOrdersForIntegration } = require('../services/orderCollectors');

// GET /api/orders
router.get('/', authMw, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `
      SELECT
        o.*,
        i.account_name
      FROM orders o
      LEFT JOIN integrations i ON i.id = o.integration_id
      ORDER BY o.order_date DESC NULLS LAST, o.created_at DESC
      LIMIT 300
      `
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/collect
router.post('/collect', authMw, async (req, res, next) => {
  try {
    const { platform } = req.body || {};

    let query = `
      SELECT *
      FROM integrations
      WHERE is_active = true
    `;
    const params = [];

    if (platform) {
      query += ` AND platform = $1`;
      params.push(String(platform).trim().toLowerCase());
    }

    query += ` ORDER BY platform ASC, account_name ASC`;

    const { rows: integrations } = await db.query(query, params);

    const results = [];

    for (const integration of integrations) {
      try {
        const result = await collectOrdersForIntegration({ db, integration });
        results.push({
          integration_id: integration.id,
          platform: integration.platform,
          account_name: integration.account_name,
          ...result,
        });
      } catch (err) {
        results.push({
          integration_id: integration.id,
          platform: integration.platform,
          account_name: integration.account_name,
          success: false,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      results,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;