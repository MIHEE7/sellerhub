async function collectAllwaysOrders({ integration }) {
  if (!integration.access_key || !integration.secret_key) {
    return { success: false, skipped: true, reason: '올웨이즈 access/secret 없음' };
  }

  return {
    success: true,
    platform: 'allways',
    count: 0,
    skipped: true,
    reason: '올웨이즈 공식 주문 API 확인 후 실제 연결 필요',
  };
}

module.exports = { collectAllwaysOrders };