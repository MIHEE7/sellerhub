const router = require('express').Router();
const db     = require('../config/db');
const authMw = require('../middleware/auth');

router.use(authMw);

// GET /api/notifications?type=&platform=&status=&page=&limit=
router.get('/', async (req, res, next) => {
  try {
    const { type, account_id, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const conds  = ['n.user_id = $1'];
    const vals   = [req.user.id];
    let i = 2;

    if (type)       { conds.push(`n.event_type = $${i++}`); vals.push(type); }
    if (account_id) { conds.push(`n.account_id = $${i++}`); vals.push(account_id); }
    if (status === 'pending') { conds.push(`n.status = 'pending'`); }
    if (status === 'done')    { conds.push(`n.status = 'done'`); }

    vals.push(Number(limit), offset);
    const { rows } = await db.query(
      `SELECT n.*, pa.account_name, pa.platform AS account_platform
       FROM notifications n
       JOIN platform_accounts pa ON pa.id = n.account_id
       WHERE ${conds.join(' AND ')}
       ORDER BY n.occurred_at DESC
       LIMIT $${i++} OFFSET $${i}`,
      vals
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/notifications/stats  — 미처리 건수 요약
router.get('/stats', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT event_type, platform, COUNT(*) AS cnt
       FROM notifications
       WHERE user_id=$1 AND status='pending'
       GROUP BY event_type, platform`,
      [req.user.id]
    );

    const byType = {};
    const byPlatform = {};
    let total = 0;
    for (const r of rows) {
      byType[r.event_type] = (byType[r.event_type] || 0) + Number(r.cnt);
      byPlatform[r.platform] = (byPlatform[r.platform] || 0) + Number(r.cnt);
      total += Number(r.cnt);
    }
    res.json({ total, byType, byPlatform });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/done
router.patch('/:id/done', async (req, res, next) => {
  try {
    await db.query(
      `UPDATE notifications SET status='done', updated_at=NOW()
       WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/done-all  — 일괄 처리
router.patch('/done-all', async (req, res, next) => {
  try {
    const { type, account_id } = req.body;
    const conds = [`user_id=$1`, `status='pending'`];
    const vals  = [req.user.id];
    let i = 2;
    if (type)       { conds.push(`event_type=$${i++}`); vals.push(type); }
    if (account_id) { conds.push(`account_id=$${i++}`); vals.push(account_id); }

    const { rowCount } = await db.query(
      `UPDATE notifications SET status='done', updated_at=NOW() WHERE ${conds.join(' AND ')}`,
      vals
    );
    res.json({ updated: rowCount });
  } catch (err) { next(err); }
});

module.exports = router;
