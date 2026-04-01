const router = require('express').Router();
const db = require('../config/db');
const authMw = require('../middleware/auth');

// GET /api/integrations
router.get('/', authMw, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `
      SELECT
        id,
        platform,
        account_name,
        client_id,
        client_secret,
        access_key,
        secret_key,
        vendor_id,
        extra,
        is_active,
        created_at,
        updated_at
      FROM integrations
      ORDER BY platform ASC, account_name ASC
      `
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations
router.post('/', authMw, async (req, res, next) => {
  try {
    const {
      platform,
      account_name,
      client_id = '',
      client_secret = '',
      access_key = '',
      secret_key = '',
      vendor_id = '',
      extra = {},
      is_active = true,
    } = req.body || {};

    const normalizedPlatform = String(platform || '').trim().toLowerCase();
    const normalizedAccountName = String(account_name || '').trim();

    if (!normalizedPlatform) {
      return res.status(400).json({ error: '플랫폼이 필요합니다.' });
    }

    if (!normalizedAccountName) {
      return res.status(400).json({ error: '계정명이 필요합니다.' });
    }

    const { rows } = await db.query(
      `
      INSERT INTO integrations (
        platform,
        account_name,
        client_id,
        client_secret,
        access_key,
        secret_key,
        vendor_id,
        extra,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, NOW(), NOW())
      RETURNING
        id,
        platform,
        account_name,
        client_id,
        client_secret,
        access_key,
        secret_key,
        vendor_id,
        extra,
        is_active,
        created_at,
        updated_at
      `,
      [
        normalizedPlatform,
        normalizedAccountName,
        client_id,
        client_secret,
        access_key,
        secret_key,
        vendor_id,
        JSON.stringify(extra || {}),
        !!is_active,
      ]
    );

    res.json({
      success: true,
      item: rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: '같은 플랫폼에 동일한 계정명이 이미 존재합니다.' });
    }
    next(err);
  }
});

// PUT /api/integrations/:id
router.put('/:id', authMw, async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();

    const {
      account_name,
      client_id = '',
      client_secret = '',
      access_key = '',
      secret_key = '',
      vendor_id = '',
      extra = {},
      is_active = true,
    } = req.body || {};

    const normalizedAccountName = String(account_name || '').trim();

    if (!id) {
      return res.status(400).json({ error: 'ID가 필요합니다.' });
    }

    if (!normalizedAccountName) {
      return res.status(400).json({ error: '계정명이 필요합니다.' });
    }

    const { rows } = await db.query(
      `
      UPDATE integrations
      SET
        account_name = $1,
        client_id = $2,
        client_secret = $3,
        access_key = $4,
        secret_key = $5,
        vendor_id = $6,
        extra = $7::jsonb,
        is_active = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING
        id,
        platform,
        account_name,
        client_id,
        client_secret,
        access_key,
        secret_key,
        vendor_id,
        extra,
        is_active,
        created_at,
        updated_at
      `,
      [
        normalizedAccountName,
        client_id,
        client_secret,
        access_key,
        secret_key,
        vendor_id,
        JSON.stringify(extra || {}),
        !!is_active,
        id,
      ]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: '대상을 찾을 수 없습니다.' });
    }

    res.json({
      success: true,
      item: rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: '같은 플랫폼에 동일한 계정명이 이미 존재합니다.' });
    }
    next(err);
  }
});

// DELETE /api/integrations/:id
router.delete('/:id', authMw, async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();

    if (!id) {
      return res.status(400).json({ error: 'ID가 필요합니다.' });
    }

    const { rowCount } = await db.query(
      `DELETE FROM integrations WHERE id = $1`,
      [id]
    );

    if (!rowCount) {
      return res.status(404).json({ error: '대상을 찾을 수 없습니다.' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;