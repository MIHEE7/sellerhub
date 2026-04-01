const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../config/db');
const authMw = require('../middleware/auth');

function createMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log('[MAIL] SMTP CONFIG', {
    host,
    port,
    secure,
    user: user ? `${user.slice(0, 3)}***` : null,
    hasPass: !!pass,
  });

  if (!host || !user || !pass) {
    throw new Error('SMTP 환경변수가 설정되지 않았습니다.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

async function sendResetPasswordMail(toEmail, resetUrl) {
  try {
    const transporter = createMailer();

    const fromName = process.env.MAIL_FROM_NAME || '셀러 허브';
    const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER;

    console.log('[MAIL] send start', {
      toEmail,
      fromEmail,
      resetUrl,
    });

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: '[셀러 허브] 비밀번호 재설정 안내',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
          <h2 style="margin-bottom: 12px;">비밀번호 재설정</h2>
          <p>아래 버튼을 눌러 새 비밀번호를 설정하세요.</p>
          <p style="margin: 24px 0;">
            <a
              href="${resetUrl}"
              style="
                display: inline-block;
                padding: 12px 20px;
                background: #2563eb;
                color: #fff;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
              "
            >
              비밀번호 재설정
            </a>
          </p>
          <p>버튼이 작동하지 않으면 아래 주소를 브라우저에 붙여넣으세요.</p>
          <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #666;">
            본 메일은 셀러 허브 시스템에서 발송되었습니다.
          </p>
        </div>
      `,
    });

    console.log('[MAIL] send success', {
      messageId: info.messageId,
      response: info.response,
    });

    return info;
  } catch (err) {
    console.error('[MAIL ERROR] sendResetPasswordMail failed');
    console.error(err);
    throw err;
  }
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: '이메일, 비밀번호, 이름은 필수입니다' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '비밀번호는 최소 6자 이상이어야 합니다' });
    }

    const hash = await bcrypt.hash(password, 10);

    const { rows } = await db.query(
      `
      INSERT INTO users (id, email, password, name, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
      RETURNING id, email, name, recovery_email
      `,
      [email, hash, name]
    );

    const user = rows[0];

    await db.query(
      `
      INSERT INTO notification_settings (user_id)
      VALUES ($1)
      ON CONFLICT DO NOTHING
      `,
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      user,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: '이미 사용 중인 이메일입니다' });
    }
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력하세요' });
    }

    const { rows } = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
    }

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        recovery_email: user.recovery_email || '',
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authMw, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `
      SELECT id, email, name, recovery_email, fcm_token, kakao_phone, notify_email
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/recovery-email
router.put('/recovery-email', authMw, async (req, res, next) => {
  try {
    const { recoveryEmail } = req.body;

    if (!recoveryEmail || !String(recoveryEmail).trim()) {
      return res.status(400).json({ error: '비밀번호 재설정 이메일을 입력하세요' });
    }

    const normalized = String(recoveryEmail).trim().toLowerCase();

    await db.query(
      `
      UPDATE users
      SET recovery_email = $1,
          recovery_email_updated_at = NOW(),
          updated_at = NOW()
      WHERE id = $2
      `,
      [normalized, req.user.id]
    );

    res.json({
      success: true,
      recovery_email: normalized,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password
router.post('/change-password', authMw, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력하세요' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '새 비밀번호는 최소 6자 이상이어야 합니다' });
    }

    const { rows } = await db.query(
      'SELECT id, password FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = rows[0];

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    const ok = await bcrypt.compare(currentPassword, user.password);

    if (!ok) {
      return res.status(401).json({ error: '현재 비밀번호가 올바르지 않습니다' });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await db.query(
      `
      UPDATE users
      SET password = $1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [hash, req.user.id]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    console.log('[MAIL] forgot-password request', { email });

    if (!email) {
      return res.status(400).json({ error: '로그인 이메일을 입력하세요' });
    }

    const normalized = String(email).trim().toLowerCase();

    const { rows } = await db.query(
      `
      SELECT id, email, recovery_email
      FROM users
      WHERE email = $1
      `,
      [normalized]
    );

    const user = rows[0];

    console.log('[MAIL] user lookup', {
      requestedEmail: normalized,
      found: !!user,
    });

    if (!user) {
      return res.json({
        success: true,
        message: '등록된 비밀번호 재설정 이메일로 안내를 보냈습니다.',
      });
    }

    if (!user.recovery_email) {
      return res.status(400).json({
        error: '등록된 비밀번호 재설정 이메일이 없습니다. 로그인 후 설정에서 먼저 등록하세요.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendBaseUrl}/reset-password?token=${resetToken}`;

    await db.query(
      `
      UPDATE users
      SET reset_password_token = $1,
          reset_password_expires_at = $2,
          updated_at = NOW()
      WHERE id = $3
      `,
      [resetToken, expiresAt, user.id]
    );

    console.log('[MAIL] token saved', {
      loginEmail: user.email,
      recoveryEmail: user.recovery_email,
      expiresAt,
    });

    await sendResetPasswordMail(user.recovery_email, resetUrl);

    res.json({
      success: true,
      message: '등록된 비밀번호 재설정 이메일로 안내를 보냈습니다.',
    });
  } catch (err) {
    console.error('[MAIL ERROR] forgot-password route failed');
    console.error(err);
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: '토큰과 새 비밀번호를 입력하세요' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '비밀번호는 최소 6자 이상이어야 합니다' });
    }

    const { rows } = await db.query(
      `
      SELECT id, reset_password_expires_at
      FROM users
      WHERE reset_password_token = $1
      `,
      [token]
    );

    const user = rows[0];

    if (!user) {
      return res.status(400).json({ error: '유효하지 않은 재설정 토큰입니다' });
    }

    if (!user.reset_password_expires_at || new Date(user.reset_password_expires_at) < new Date()) {
      return res.status(400).json({ error: '재설정 토큰이 만료되었습니다' });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await db.query(
      `
      UPDATE users
      SET password = $1,
          reset_password_token = NULL,
          reset_password_expires_at = NULL,
          updated_at = NOW()
      WHERE id = $2
      `,
      [hash, user.id]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/fcm-token
router.put('/fcm-token', authMw, async (req, res, next) => {
  try {
    const { token } = req.body;

    await db.query(
      `
      UPDATE users
      SET fcm_token = $1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [token, req.user.id]
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;