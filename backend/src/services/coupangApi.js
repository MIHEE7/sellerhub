/**
 * 쿠팡 Wing API 연동
 * Docs: https://developers.coupang.com/
 * 인증: HMAC-SHA256 서명
 */
const axios  = require('axios');
const crypto = require('crypto');

const BASE = process.env.COUPANG_API_BASE || 'https://api-gateway.coupang.com';

function buildHmacAuth(method, path, accessKey, secretKey) {
  const datetime = new Date().toISOString().replace(/[:-]/g, '').slice(0, 15) + 'Z';
  const message  = datetime + method + path;
  const signature = crypto.createHmac('sha256', secretKey).update(message).digest('hex');
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

async function coupangGet(path, account, params = {}) {
  const query    = new URLSearchParams(params).toString();
  const fullPath = query ? `${path}?${query}` : path;
  const auth     = buildHmacAuth('GET', fullPath, account.client_id, account.client_secret);

  const { data } = await axios.get(`${BASE}${fullPath}`, {
    headers: { Authorization: auth, 'Content-Type': 'application/json;charset=UTF-8' },
  });
  return data;
}

async function fetchCoupangEvents(account) {
  const vendorId = account.extra_field;
  const since = account.last_polled_at
    ? new Date(account.last_polled_at).toISOString()
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const createdAt = since.slice(0, 19); // YYYY-MM-DDTHH:mm:ss
  const events = [];

  // ── 신규 주문 ──────────────────────────────────────
  try {
    const res = await coupangGet(
      `/v2/providers/seller_api/apis/api/v4/vendors/${vendorId}/ordersheets`,
      account,
      { createdAtFrom: createdAt, status: 'ACCEPT' }
    );
    for (const o of (res.data?.content || [])) {
      events.push({
        event_type:    'order',
        external_id:   `coupang-${o.orderId}`,
        title:         `신규주문 — ${o.orderItems?.[0]?.productName}`,
        product_name:  o.orderItems?.[0]?.productName,
        customer_name: o.orderer?.name,
        amount:        o.totalPrice,
        occurred_at:   o.paidAt,
        raw_payload:   o,
        priority:      'normal',
      });
    }
  } catch (e) { console.warn('[Coupang] orders failed', e.message); }

  // ── 취소 ──────────────────────────────────────────
  try {
    const res = await coupangGet(
      `/v2/providers/seller_api/apis/api/v4/vendors/${vendorId}/returnRequests`,
      account,
      { createdAtFrom: createdAt, status: 'CANCEL' }
    );
    for (const c of (res.data?.content || [])) {
      events.push({
        event_type:    'cancel',
        external_id:   `coupang-cancel-${c.receiptId}`,
        title:         `취소요청 — ${c.orderItems?.[0]?.productName}`,
        product_name:  c.orderItems?.[0]?.productName,
        customer_name: c.orderer?.name,
        amount:        c.refundPrice,
        reason:        c.cancelReason,
        occurred_at:   c.requestedAt,
        raw_payload:   c,
        priority:      'high',
      });
    }
  } catch (e) { console.warn('[Coupang] cancels failed', e.message); }

  // ── 반품 ──────────────────────────────────────────
  try {
    const res = await coupangGet(
      `/v2/providers/seller_api/apis/api/v4/vendors/${vendorId}/returnRequests`,
      account,
      { createdAtFrom: createdAt, status: 'RETURN' }
    );
    for (const r of (res.data?.content || [])) {
      events.push({
        event_type:    'refund',
        external_id:   `coupang-return-${r.receiptId}`,
        title:         `반품요청 — ${r.orderItems?.[0]?.productName}`,
        product_name:  r.orderItems?.[0]?.productName,
        customer_name: r.orderer?.name,
        amount:        r.refundPrice,
        reason:        r.returnReason,
        occurred_at:   r.requestedAt,
        raw_payload:   r,
        priority:      'high',
      });
    }
  } catch (e) { console.warn('[Coupang] returns failed', e.message); }

  // ── 교환 ──────────────────────────────────────────
  try {
    const res = await coupangGet(
      `/v2/providers/seller_api/apis/api/v4/vendors/${vendorId}/returnRequests`,
      account,
      { createdAtFrom: createdAt, status: 'EXCHANGE' }
    );
    for (const ex of (res.data?.content || [])) {
      events.push({
        event_type:    'exchange',
        external_id:   `coupang-exchange-${ex.receiptId}`,
        title:         `교환요청 — ${ex.orderItems?.[0]?.productName}`,
        product_name:  ex.orderItems?.[0]?.productName,
        customer_name: ex.orderer?.name,
        reason:        ex.exchangeReason,
        occurred_at:   ex.requestedAt,
        raw_payload:   ex,
        priority:      'normal',
      });
    }
  } catch (e) { console.warn('[Coupang] exchanges failed', e.message); }

  // ── 문의 ──────────────────────────────────────────
  try {
    const res = await coupangGet(
      `/v2/providers/seller_api/apis/api/v4/vendors/${vendorId}/onlineQnas`,
      account,
      { createdAtFrom: createdAt }
    );
    for (const q of (res.data?.content || [])) {
      events.push({
        event_type:    'inquiry',
        external_id:   `coupang-qna-${q.qnaId}`,
        title:         `문의: ${q.questionContent?.slice(0, 40)}`,
        customer_name: q.questioner,
        occurred_at:   q.questionRegisteredAt,
        raw_payload:   q,
        priority:      'normal',
      });
    }
  } catch (e) { console.warn('[Coupang] inquiries failed', e.message); }

  return events;
}

async function testCoupangConnection(account) {
  try {
    await coupangGet(
      `/v2/providers/seller_api/apis/api/v4/vendors/${account.extra_field}/ordersheets`,
      account,
      { createdAtFrom: new Date(Date.now() - 3600000).toISOString().slice(0, 19) }
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.response?.data?.message || e.message };
  }
}

module.exports = { fetchCoupangEvents, testCoupangConnection };
