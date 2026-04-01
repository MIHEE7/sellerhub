async function collectTalkstoreOrders({ integration }) {
  if (!integration.client_id || !integration.client_secret) {
    return { success: false, skipped: true, reason: '톡스토어 app/admin key 없음' };
  }

  return {
    success: true,
    platform: 'talkstore',
    count: 0,
    skipped: true,
    reason: '톡스토어 주문 API 연결 전 placeholder',
  };
}

module.exports = { collectTalkstoreOrders };