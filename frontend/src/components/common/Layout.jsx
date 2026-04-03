import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';

const navItems = [
  { to: '/dashboard', label: '대시보드' },
  { to: '/orders', label: '주문 수집' },
  { to: '/market-settings', label: 'API 설정' },
  { to: '/settings', label: '내 설정' },
];

export default function Layout({ title = '', subtitle = '', children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6f8' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Link
              to="/dashboard"
              style={{
                textDecoration: 'none',
                color: '#111827',
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              SELLERHUB
            </Link>

            <nav style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {navItems.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    style={{
                      textDecoration: 'none',
                      padding: '10px 14px',
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 700,
                      color: active ? '#ffffff' : '#374151',
                      background: active ? '#2563eb' : '#f3f4f6',
                      border: active ? '1px solid #2563eb' : '1px solid #e5e7eb',
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: '#6b7280' }}>로그인 사용자</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                {user?.name || user?.email || '사용자'}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                border: 'none',
                background: '#ef4444',
                color: '#fff',
                fontWeight: 800,
                borderRadius: 10,
                padding: '10px 14px',
                cursor: 'pointer',
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        {(title || subtitle) && (
          <div style={{ marginBottom: 24 }}>
            {title ? (
              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  fontWeight: 800,
                  color: '#111827',
                }}
              >
                {title}
              </h1>
            ) : null}

            {subtitle ? (
              <div style={{ marginTop: 8, color: '#6b7280', fontSize: 15 }}>
                {subtitle}
              </div>
            ) : null}
          </div>
        )}

        {children}
      </main>
    </div>
  );
}