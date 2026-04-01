/**
 * 네이버 커머스 API 연동
 * Docs: https://api.commerce.naver.com/swagger-ui.html
 */
const axios = require('axios');

const BASE = process.env.NAVER_API_BASE || 'https://api.commerce.naver.com/external';

async function getNaverToken(clientId, clientSecret) {
  const timestamp = Date.now();
  const sig = Buffer.from(`${clientId}_${timestamp}`).toString('base64');
  // 실제: HMAC-SHA256 서명 필요 (네이버 커머스 API 인증 방식)
  const { data } = await axios.post(
    `${BASE}/v1/oauth2/token`,
    new URLSearchParams({ client_id: clientId, timestamp, client_secret_sign: sig, grant_type: 'client_credentials', type: 'SELF' }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return data.access_token;
}

async function fetchNaverEvents(account) {
  const token = await getNaverToken(account.client_id, account.client_secret);
  const headers = { Authorization: `Bearer ${token}` };

  const since = account.last_polled_at
    ? new Date(account.last_polled_at).toISOString()
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const events = [];

  // ── 신규 주문 ──────────────────────────────────────
  try {
    const { data: orders } = await axios.get(
      `${BASE}/v1/pay-order/seller/orders/new-order`, {
        headers,
        params: { lastChangedFrom: since, lastChangedType: 'PAY_WAITING' }
      }
    );
    for (const o of (orders.contents || [])) {
      events.push({
        event_type:    'order',
        external_id:   `naver-${o.orderId}`,
        title:         `신규주문 — ${o.productName}`,
        product_name:  o.productName,
        customer_name: o.ordererName,
        amount:        o.totalPaymentAmount,
        occurred_at:   o.paymentDate,
        raw_payload:   o,
        priority:      'normal',
      });
    }
  } catch (e) { console.warn('[Naver] orders fetch failed', e.message); }

  // ── 취소 ──────────────────────────────────────────
  try {
    const { data: cancels } = await axios.get(
      `${BASE}/v1/pay-order/seller/claim/cancel-request/search`, {
        headers,
        params: { lastChangedFrom: since }
      }
    );
    for (const c of (cancels.contents || [])) {
      events.push({
        event_type:    'cancel',
        external_id:   `naver-cancel-${c.claimId}`,
        title:         `취소요청 — ${c.productName}`,
        product_name:  c.productName,
        customer_name: c.ordererName,
        amount:        c.claimAmount,
        reason:        c.claimReason,
        occurred_at:   c.claimRequestDate,
        raw_payload:   c,
        priority:      'high',
      });
    }
  } catch (e) { console.warn('[Naver] cancels fetch failed', e.message); }

  // ── 반품 ──────────────────────────────────────────
  try {
    const { data: returns } = await axios.get(
      `${BASE}/v1/pay-order/seller/claim/return-request/search`, {
        headers,
        params: { lastChangedFrom: since }
      }
    );
    for (const r of (returns.contents || [])) {
      events.push({
        event_type:    'refund',
        external_id:   `naver-return-${r.claimId}`,
        title:         `반품요청 — ${r.productName}`,
        product_name:  r.productName,
        customer_name: r.ordererName,
        amount:        r.claimAmount,
        reason:        r.claimReason,
        occurred_at:   r.claimRequestDate,
        raw_payload:   r,
        priority:      'high',
      });
    }
  } catch (e) { console.warn('[Naver] returns fetch failed', e.message); }

  // ── 교환 ──────────────────────────────────────────
  try {
    const { data: exchanges } = await axios.get(
      `${BASE}/v1/pay-order/seller/claim/exchange-request/search`, {
        headers,
        params: { lastChangedFrom: since }
      }
    );
    for (const ex of (exchanges.contents || [])) {
      events.push({
        event_type:    'exchange',
        external_id:   `naver-exchange-${ex.claimId}`,
        title:         `교환요청 — ${ex.productName}`,
        product_name:  ex.productName,
        customer_name: ex.ordererName,
        amount:        ex.claimAmount,
        reason:        ex.claimReason,
        occurred_at:   ex.claimRequestDate,
        raw_payload:   ex,
        priority:      'normal',
      });
    }
  } catch (e) { console.warn('[Naver] exchanges fetch failed', e.message); }

  // ── 문의 ──────────────────────────────────────────
  try {
    const { data: inquiries } = await axios.get(
      `${BASE}/v1/seller/question/questions`, {
        headers,
        params: { fromDate: since.split('T')[0], page: 1, pageSize: 50 }
      }
    );
    for (const q of (inquiries.questions || [])) {
      events.push({
        event_type:    'inquiry',
        external_id:   `naver-qna-${q.questionId}`,
        title:         `문의: ${q.questionTitle || q.questionContent?.slice(0, 30)}`,
        customer_name: q.questioner,
        occurred_at:   q.questionRegisteredDate,
        raw_payload:   q,
        priority:      'normal',
      });
    }
  } catch (e) { console.warn('[Naver] inquiries fetch failed', e.message); }

  return events;
}

async function testNaverConnection(account) {
  try {
    await getNaverToken(account.client_id, account.client_secret);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.response?.data?.message || e.message };
  }
}

module.exports = { fetchNaverEvents, testNaverConnection };
