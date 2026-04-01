const { upsertOrder, isoOrNull } = require('./base');

async function collectEmsOrders({ db, integration }) {
  const apiKey = integration.access_key;
  const secretKey = integration.secret_key;

  if (!apiKey || !secretKey) {
    return { success: false, skipped: true, reason: 'EMS access_key/secret_key 없음' };
  }

  // 실제 EMS 연동 시 여기를 공식 EMS API/연동 방식에 맞게 교체
  const orders = [];

  for (const item of orders) {
    await upsertOrder(db, {
      platform: 'gmarket',
      integration_id: integration.id,
      external_order_id: String(item.order_id || item.id),
      order_status: item.status || '',
      order_date: isoOrNull(item.ordered_at),
      buyer_name: item.buyer_name || '',
      buyer_phone: item.buyer_phone || '',
      receiver_name: item.receiver_name || '',
      receiver_phone: item.receiver_phone || '',
      product_name: item.product_name || '',
      sku: item.sku || '',
      quantity: Number(item.quantity || 1),
      amount: Number(item.amount || 0),
      raw_data: item,
    });
  }

  return {
    success: true,
    platform: 'gmarket',
    count: orders.length,
    skipped: true,
    reason: 'EMS 실제 API 엔드포인트 연결 전 placeholder',
  };
}

module.exports = { collectEmsOrders };