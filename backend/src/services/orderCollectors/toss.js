async function collectTossOrders({ integration }) {
  if (!integration.access_key || !integration.secret_key) {
    return { success: false, skipped: true, reason: '토스 client/secret 없음' };
  }

  return {
    success: true,
    platform: 'toss',
    count: 0,
    skipped: true,
    reason: '토스는 현재 결제 연동 성격이 커서 주문 수집 placeholder',
  };
}

module.exports = { collectTossOrders };