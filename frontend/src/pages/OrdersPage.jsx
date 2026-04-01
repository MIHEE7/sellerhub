import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
    <div style={{ padding: 24, background: '#f5f6f8', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>주문 수집</h1>
        <div style={{ color: '#6b7280', marginBottom: 20 }}>
          네이버 / 쿠팡 / 카페24 / EMS / 지그재그 / 11번가 / 톡스토어 / 토스 / 올웨이즈 통합 주문 조회
        </div>

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
            borderRadius: 8,
            background: '#2563eb',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: 20,
          }}
        >
          {collectMutation.isPending ? '수집 중...' : '주문 수집 실행'}
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
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 12 }}>수집 실행 결과</div>

            <div style={{ display: 'grid', gap: 10 }}>
              {collectResults.map((item, idx) => (
                <div
                  key={`${item.platform}-${item.account_name}-${idx}`}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div style={{ fontWeight: 700 }}>
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

        <div style={{ fontWeight: 700, marginBottom: 12 }}>수집된 주문 목록</div>

        <div style={{ display: 'grid', gap: 12 }}>
          {orders.length === 0 ? (
            <div
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
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
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ fontWeight: 700 }}>
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
      </div>
    </div>
  );
}