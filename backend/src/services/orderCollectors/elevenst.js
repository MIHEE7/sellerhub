async function collectElevenstOrders({ integration }) {
  if (!integration.access_key) {
    return { success: false, skipped: true, reason: '11번가 API Key 없음' };
  }

  return {
    success: true,
    platform: 'elevenst',
    count: 0,
    skipped: true,
    reason: '11번가 주문 API 연결 전 placeholder',
  };
}

module.exports = { collectElevenstOrders };