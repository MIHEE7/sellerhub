async function collectZigzagOrders({ integration }) {
  if (!integration.access_key || !integration.secret_key) {
    return { success: false, skipped: true, reason: '지그재그 access_key/secret_key 없음' };
  }

  return {
    success: true,
    platform: 'zigzag',
    count: 0,
    skipped: true,
    reason: '지그재그 주문 API 세부 엔드포인트 연결 전 placeholder',
  };
}

module.exports = { collectZigzagOrders };