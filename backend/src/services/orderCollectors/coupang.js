const crypto = require('crypto');
const { upsertOrder, isoOrNull } = require('./base');

function makeCoupangAuth(accessKey, secretKey, method, path, queryString = '') {
  const datetime = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const message = `${datetime}${method}${path}${queryString}`;
  const signature = crypto.createHmac('sha256', secretKey).update(message).digest('hex');
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

async function collectCoupangOrders({ db, integration }) {
  const baseUrl = (integration.extra?.api_base || process.env.COUPANG_API_BASE || 'https://api-gateway.coupang.com').replace(/\/$/, '');
  const accessKey = integration.access_key;
  const secretKey = integration.secret_key;
  const vendorId = integration.vendor_id;

  if (!accessKey || !secretKey || !vendorId) {
    return { success: false, skipped: true, reason: '쿠팡 access_key/secret_key/vendor_id 없음' };
  }

  const path = `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/ordersheets`;
  const queryString = '';
  const auth = makeCoupangAuth(accessKey, secretKey, 'GET', path, queryString);

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`쿠팡 주문 조회 실패: ${res.status} ${text}`);
  }

  const data = await res.json();
  const orders = data?.data || [];

  for (const item of orders) {
    await upsertOrder(db, {
      platform: 'coupang',
      integration_id: integration.id,
      external_order_id: String(item.orderId || item.shipmentBoxId || item.orderSheetId),
      order_status: item.orderStatus || '',
      order_date: isoOrNull(item.orderedAt || item.paymentDate),
      buyer_name: item.ordererName || '',
      buyer_phone: item.ordererMobile || '',
      receiver_name: item.receiverName || '',
      receiver_phone: item.receiverMobile || '',
      product_name: item.vendorItemName || item.productName || '',
      sku: item.vendorItemId ? String(item.vendorItemId) : '',
      quantity: Number(item.orderCount || 1),
      amount: Number(item.orderPriceAmount || item.salesPrice || 0),
      raw_data: item,
    });
  }

  return {
    success: true,
    platform: 'coupang',
    count: orders.length,
  };
}

module.exports = { collectCoupangOrders };