const router  = require('express').Router();
const db      = require('../config/db');
const authMw  = require('../middleware/auth');
const { testPlatformConnection } = require('../services/platformTest');

// 모든 엔드포인트 인증 필요
router.use(authMw);

// GET /api/accounts
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, platform, account_name, seller_id,
              LEFT(client_id, 8) || '••••••' AS client_id_masked,
              extra_field, is_active, last_polled_at, last_error, sort_order
       FROM platform_accounts
       WHERE user_id = $1
       ORDER BY platform, sort_order`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/accounts  — 계정 추가
router.post('/', async (req, res, next) => {
  try {
    const { platform, account_name, seller_id, client_id, client_secret, extra_field } = req.body;
    if (!platform || !account_name || !client_id || !client_secret)
      return res.status(400).json({ error: '필수 필드가 누락되었습니다' });

    const { rows } = await db.query(
      `INSERT INTO platform_accounts
         (user_id, platform, account_name, seller_id, client_id, client_secret, extra_field)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, platform, account_name, seller_id, extra_field, is_active`,
      [req.user.id, platform, account_name, seller_id, client_id, client_secret, extra_field]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/accounts/:id  — 계정 수정
router.put('/:id', async (req, res, next) => {
  try {
    const { account_name, seller_id, client_id, client_secret, extra_field, is_active } = req.body;
    const updates = [];
    const vals = [];
    let i = 1;

    if (account_name   !== undefined) { updates.push(`account_name=$${i++}`);   vals.push(account_name); }
    if (seller_id      !== undefined) { updates.push(`seller_id=$${i++}`);      vals.push(seller_id); }
    if (client_id      !== undefined) { updates.push(`client_id=$${i++}`);      vals.push(client_id); }
    if (client_secret  !== undefined) { updates.push(`client_secret=$${i++}`);  vals.push(client_secret); }
    if (extra_field    !== undefined) { updates.push(`extra_field=$${i++}`);    vals.push(extra_field); }
    if (is_active      !== undefined) { updates.push(`is_active=$${i++}`);      vals.push(is_active); }

    if (!updates.length) return res.status(400).json({ error: '수정할 내용이 없습니다' });

    updates.push(`updated_at=NOW()`);
    vals.push(req.params.id, req.user.id);

    const { rows } = await db.query(
      `UPDATE platform_accounts SET ${updates.join(',')}
       WHERE id=$${i++} AND user_id=$${i} RETURNING id, platform, account_name, is_active`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: '계정을 찾을 수 없습니다' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await db.query(
      'DELETE FROM platform_accounts WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/accounts/:id/test  — API 연결 테스트
router.post('/:id/test', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM platform_accounts WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: '계정을 찾을 수 없습니다' });

    const result = await testPlatformConnection(rows[0]);
    await db.query(
      'UPDATE platform_accounts SET last_error=$1, updated_at=NOW() WHERE id=$2',
      [result.ok ? null : result.error, req.params.id]
    );
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
