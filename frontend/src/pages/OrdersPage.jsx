import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Layout from '../components/common/Layout';
import api from '../services/api';

export default function OrdersPage() {
  const qc = useQueryClient();
  const [runMsg, setRunMsg] = useState('');
  const [runError, setRunError] = useState('');
  const [collectResults, setCollectResults] = useState([]);

  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get('/orders');
      return res?.data ?? [];
    },
  });

  const collectMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/orders/collect', {});
      return res?.data ?? res;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      setRunError('');
      setRunMsg('주문 수집이 완료되었습니다.');
      setCollectResults(data?.results || []);
    },
    onError: (err) => {
      setRunMsg('');
      setCollectResults([]);
      setRunError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          '주문 수집 실행 중 오류가 발생했습니다.'
      );
    },
  });

  return (
    <Layout
      title="주문 수집"
      subtitle="플랫폼 주문을 수집하고 저장된 주문 목록을 확인합니다."
    >
      <button
        onClick={() => {
          setRunMsg('');
          setRunError('');
          setCollectResults([]);
          collectMutation.mutate();
        }}
        disabled={collectMutation.isPending}
        style={{
          padding: '10px 16px',
          border: 'none',
          borderRadius: 10,
          background: '#2563eb',
          color: '#fff',
          fontWeight: 800,
          cursor: 'pointer',
          marginBottom: 20,
        }}
      >
        {collectMutation.isPending ? '주문 수집 중...' : '주문 수집 실행'}
      </button>

      {runMsg ? (
        <div style={{ color: '#15803d', marginBottom: 16 }}>{runMsg}</div>
      ) : null}

      {runError ? (
        <div style={{ color: '#dc2626', marginBottom: 16 }}>{runError}</div>
      ) : null}

      {collectResults.length > 0 ? (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 12 }}>수집 실행 결과</div>

          <div style={{ display: 'grid', gap: 10 }}>
            {collectResults.map((item, idx) => (
              <div
                key={`${item.platform}-${item.account_name}-${idx}`}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                }}
              >
                <div style={{ fontWeight: 800 }}>
                  [{item.platform}] {item.account_name || '-'}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                  성공 여부: {item.success ? '성공' : '실패'}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  수집 건수: {item.count ?? 0}
                </div>
                {item.reason ? (
                  <div style={{ fontSize: 13, color: '#b45309' }}>
                    안내: {item.reason}
                  </div>
                ) : null}
                {item.error ? (
                  <div style={{ fontSize: 13, color: '#dc2626' }}>
                    오류: {item.error}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isLoading ? <div>불러오는 중...</div> : null}
      {error ? <div style={{ color: '#dc2626' }}>{error.message}</div> : null}

      <div style={{ fontWeight: 800, marginBottom: 12 }}>수집된 주문 목록</div>

      <div style={{ display: 'grid', gap: 12 }}>
        {orders.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 16,
              padding: 16,
              color: '#6b7280',
            }}
          >
            아직 저장된 주문이 없습니다.
          </div>
        ) : (
          orders.map((item) => (
            <div
              key={`${item.platform}-${item.external_order_id}`}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 800 }}>
                [{item.platform}] {item.product_name || '-'}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
                주문번호: {item.external_order_id}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                계정명: {item.account_name || '-'}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                주문상태: {item.order_status || '-'}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                수량: {item.quantity || 0} / 금액: {item.amount || 0}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                주문일: {item.order_date || '-'}
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}