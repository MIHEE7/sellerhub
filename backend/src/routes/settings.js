const router = require('express').Router();
const db     = require('../config/db');
const authMw = require('../middleware/auth');

router.use(authMw);

// GET /api/settings
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM notification_settings WHERE user_id=$1',
      [req.user.id]
    );
    res.json(rows[0] || {});
  } catch (err) { next(err); }
});

// PUT /api/settings
router.put('/', async (req, res, next) => {
  try {
    const allowed = [
      'push_enabled','kakao_enabled','email_enabled','email_frequency',
      'sound_enabled','type_order','type_cancel','type_refund',
      'type_exchange','type_inquiry','quiet_enabled','quiet_start',
      'quiet_end','quiet_days','auto_draft_reply','auto_report',
      'report_time','renotify_hours','poll_interval',
    ];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        sets.push(`${key}=$${i++}`);
        vals.push(req.body[key]);
      }
    }
    if (!sets.length) return res.status(400).json({ error: '변경할 항목이 없습니다' });
    sets.push(`updated_at=NOW()`);
    vals.push(req.user.id);

    const { rows } = await db.query(
      `UPDATE notification_settings SET ${sets.join(',')} WHERE user_id=$${i} RETURNING *`,
      vals
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
