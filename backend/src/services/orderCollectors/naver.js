const { upsertOrder, isoOrNull } = require('./base');

async function collectNaverOrders({ db, integration }) {
  const baseUrl = (integration.extra?.api_base || process.env.NAVER_API_BASE || 'https://api.commerce.naver.com/external').replace(/\/$/, '');
  const accessToken = integration.access_key;
  const since = integration.extra?.since || null;

  if (!accessToken) {
    return { success: false, skipped: true, reason: '네이버 access_key(access token) 없음' };
  }

  const url = new URL(`${baseUrl}/v1/pay-order/seller/product-orders/query`);
  if (since) {
    url.searchParams.set('from', since);
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`네이버 주문 조회 실패: ${res.status} ${text}`);
  }

  const data = await res.json();
  const orders = data?.contents || data?.data || data?.orders || [];

  for (const item of orders) {
    await upsertOrder(db, {
      platform: 'naver',
      integration_id: integration.id,
      external_order_id: String(item.productOrderId || item.orderId || item.id),
      order_status: item.productOrderStatus || item.orderStatus || '',
      order_date: isoOrNull(item.paymentDate || item.orderDate || item.orderedAt),
      buyer_name: item.ordererName || '',
      buyer_phone: item.ordererTel || '',
      receiver_name: item.shippingAddress?.name || item.receiverName || '',
      receiver_phone: item.shippingAddress?.tel1 || item.receiverTel || '',
      product_name: item.productName || '',
      sku: item.optionCode || item.sellerProductCode || '',
      quantity: Number(item.quantity || 1),
      amount: Number(item.totalPaymentAmount || item.paymentAmount || 0),
      raw_data: item,
    });
  }

  return {
    success: true,
    platform: 'naver',
    count: orders.length,
  };
}

module.exports = { collectNaverOrders };