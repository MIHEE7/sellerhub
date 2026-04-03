import { Link } from 'react-router-dom';
import Layout from '../components/common/Layout';

const cards = [
  {
    title: '주문 수집',
    desc: '네이버, 쿠팡, 톡스토어, 11번가 등 주문을 통합 조회합니다.',
    to: '/orders',
    color: '#2563eb',
  },
  {
    title: 'API 설정',
    desc: '플랫폼별 계정과 API 키를 등록하고 수정합니다.',
    to: '/market-settings',
    color: '#10b981',
  },
  {
    title: '내 설정',
    desc: '비밀번호 재설정 이메일 등 개인 설정을 관리합니다.',
    to: '/settings',
    color: '#8b5cf6',
  },
];

export default function DashboardPage() {
  return (
    <Layout
      title="대시보드"
      subtitle="주문 수집, API 설정, 계정 관리 기능으로 빠르게 이동할 수 있습니다."
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            style={{
              textDecoration: 'none',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 16,
              padding: 20,
              display: 'block',
              boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: card.color,
                marginBottom: 16,
              }}
            />
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#111827',
                marginBottom: 10,
              }}
            >
              {card.title}
            </div>
            <div style={{ color: '#6b7280', lineHeight: 1.6 }}>{card.desc}</div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}