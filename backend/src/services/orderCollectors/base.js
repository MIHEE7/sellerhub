async function upsertOrder(db, order) {
  const {
    platform,
    integration_id = null,
    external_order_id,
    order_status = '',
    order_date = null,
    buyer_name = '',
    buyer_phone = '',
    receiver_name = '',
    receiver_phone = '',
    product_name = '',
    sku = '',
    quantity = 1,
    amount = 0,
    raw_data = {},
  } = order;

  if (!platform || !external_order_id) {
    throw new Error('platform, external_order_id는 필수입니다.');
  }

  await db.query(
    `
    INSERT INTO orders (
      platform,
      integration_id,
      external_order_id,
      order_status,
      order_date,
      buyer_name,
      buyer_phone,
      receiver_name,
      receiver_phone,
      product_name,
      sku,
      quantity,
      amount,
      raw_data,
      created_at,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, NOW(), NOW()
    )
    ON CONFLICT (platform, external_order_id)
    DO UPDATE SET
      integration_id = EXCLUDED.integration_id,
      order_status = EXCLUDED.order_status,
      order_date = EXCLUDED.order_date,
      buyer_name = EXCLUDED.buyer_name,
      buyer_phone = EXCLUDED.buyer_phone,
      receiver_name = EXCLUDED.receiver_name,
      receiver_phone = EXCLUDED.receiver_phone,
      product_name = EXCLUDED.product_name,
      sku = EXCLUDED.sku,
      quantity = EXCLUDED.quantity,
      amount = EXCLUDED.amount,
      raw_data = EXCLUDED.raw_data,
      updated_at = NOW()
    `,
    [
      platform,
      integration_id,
      external_order_id,
      order_status,
      order_date,
      buyer_name,
      buyer_phone,
      receiver_name,
      receiver_phone,
      product_name,
      sku,
      quantity,
      amount,
      JSON.stringify(raw_data || {}),
    ]
  );
}

function isoOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

module.exports = {
  upsertOrder,
  isoOrNull,
};