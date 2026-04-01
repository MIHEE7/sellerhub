/**
 * 알림 발송 서비스
 * - FCM 푸시 (모바일)
 * - 카카오 알림톡
 * - 이메일 (SendGrid)
 */
const axios = require('axios');
const db    = require('../config/db');

const TYPE_LABELS = {
  order: '신규주문', cancel: '취소요청',
  refund: '반품요청', exchange: '교환요청', inquiry: '문의',
};

// ── FCM 푸시 ──────────────────────────────────────────────
async function sendPush(fcmToken, notification) {
  if (!fcmToken || !process.env.FCM_SERVER_KEY) return;
  try {
    await axios.post('https://fcm.googleapis.com/fcm/send', {
      to: fcmToken,
      notification: {
        title: `[${TYPE_LABELS[notification.event_type]}] ${notification.platform}`,
        body:  notification.title,
        sound: 'default',
      },
      data: { notificationId: notification.id, eventType: notification.event_type },
    }, {
      headers: { Authorization: `key=${process.env.FCM_SERVER_KEY}` },
    });
  } catch (e) {
    console.warn('[Push] FCM 발송 실패:', e.message);
  }
}

// ── 카카오 알림톡 ──────────────────────────────────────────
async function sendKakao(phone, notification) {
  if (!phone || !process.env.KAKAO_BIZTALK_API_KEY) return;
  try {
    await axios.post('https://kakaoapi.aligo.in/akv10/alimtalk/send/', {
      apikey:     process.env.KAKAO_BIZTALK_API_KEY,
      userid:     process.env.KAKAO_BIZTALK_USER_ID,
      senderkey:  process.env.KAKAO_BIZTALK_SENDER_KEY,
      tpl_code:   'SELLER_NOTIF',
      receiver_1: phone,
      subject_1:  TYPE_LABELS[notification.event_type],
      message_1:  `[${notification.platform}] ${notification.title}\n주문번호: ${notification.external_id}`,
    }, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  } catch (e) {
    console.warn('[Kakao] 알림톡 발송 실패:', e.message);
  }
}

// ── 이메일 ─────────────────────────────────────────────────
async function sendEmail(email, notifications) {
  if (!email || !process.env.SENDGRID_API_KEY) return;
  try {
    const rows = notifications.map(n =>
      `<tr><td>${TYPE_LABELS[n.event_type]}</td><td>${n.platform}</td><td>${n.title}</td><td>${n.amount ? n.amount.toLocaleString()+'원' : '-'}</td></tr>`
    ).join('');

    await axios.post('https://api.sendgrid.com/v3/mail/send', {
      personalizations: [{ to: [{ email }] }],
      from: { email: process.env.SENDGRID_FROM_EMAIL, name: '셀러 허브' },
      subject: `[셀러 허브] 미처리 알림 ${notifications.length}건`,
      content: [{
        type: 'text/html',
        value: `<h2>새 알림 ${notifications.length}건</h2>
          <table border="1" cellpadding="6" style="border-collapse:collapse;">
            <thead><tr><th>유형</th><th>플랫폼</th><th>내용</th><th>금액</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`,
      }],
    }, { headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}` } });
  } catch (e) {
    console.warn('[Email] 발송 실패:', e.message);
  }
}

// ── 방해금지 체크 ──────────────────────────────────────────
function isQuietTime(settings) {
  if (!settings.quiet_enabled) return false;
  const now    = new Date();
  const dow    = now.getDay(); // 0=일
  const days   = settings.quiet_days || [1,2,3,4,5];
  if (!days.includes(dow)) return false;

  const hhmm = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = settings.quiet_start.split(':').map(Number);
  const [eh, em] = settings.quiet_end.split(':').map(Number);
  const start = sh * 60 + sm;
  const end   = eh * 60 + em;

  return start < end
    ? hhmm >= start && hhmm < end
    : hhmm >= start || hhmm < end; // 자정 넘기는 경우
}

// ── 메인 발송 ──────────────────────────────────────────────
async function sendNotifications(userId, newEvents) {
  const { rows: users }    = await db.query('SELECT * FROM users WHERE id=$1', [userId]);
  const { rows: settings } = await db.query('SELECT * FROM notification_settings WHERE user_id=$1', [userId]);
  const user = users[0];
  const cfg  = settings[0] || {};
  if (!user) return;

  const quiet    = isQuietTime(cfg);
  const highOnly = quiet; // 방해금지 시 high priority만

  for (const ev of newEvents) {
    const isHigh = ev.priority === 'high';
    if (highOnly && !isHigh) continue;

    // FCM 푸시
    if (cfg.push_enabled && user.fcm_token) {
      await sendPush(user.fcm_token, ev);
      await db.query('UPDATE notifications SET notified_push=TRUE WHERE id=$1', [ev.id]);
    }

    // 카카오 알림톡
    if (cfg.kakao_enabled && user.kakao_phone) {
      await sendKakao(user.kakao_phone, ev);
      await db.query('UPDATE notifications SET notified_kakao=TRUE WHERE id=$1', [ev.id]);
    }
  }

  // 이메일 (즉시 발송 모드일 때)
  if (cfg.email_enabled && cfg.email_frequency === 'instant' && user.notify_email) {
    await sendEmail(user.notify_email, newEvents);
    await db.query(
      'UPDATE notifications SET notified_email=TRUE WHERE id=ANY($1)',
      [newEvents.map(e => e.id)]
    );
  }
}

module.exports = { sendNotifications };
