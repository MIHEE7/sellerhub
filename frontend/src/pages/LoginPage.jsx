import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import api from '../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });

      const token = res?.data?.token;
      const user = res?.data?.user;

      if (!token || !user) {
        throw new Error('로그인 응답값이 올바르지 않습니다.');
      }

      setAuth(token, user);
      navigate('/settings');
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          '로그인 실패'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          width: 380,
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 14,
          padding: 32,
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
            셀러 허브
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            멀티 오픈마켓 알림 관리
          </div>
        </div>

        <form onSubmit={handle}>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              이메일
            </label>
            <input
              type="email"
              placeholder="이메일 입력"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: 13,
                border: '0.5px solid rgba(0,0,0,.2)',
                borderRadius: 8,
                background: 'var(--surface)',
                color: 'var(--text)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              비밀번호
            </label>
            <input
              type="password"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: 13,
                border: '0.5px solid rgba(0,0,0,.2)',
                borderRadius: 8,
                background: 'var(--surface)',
                color: 'var(--text)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div
            style={{
              marginBottom: 18,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <Link
              to="/forgot-password"
              style={{
                fontSize: 12,
                color: 'var(--blue)',
                textDecoration: 'none',
              }}
            >
              비밀번호 찾기
            </Link>
          </div>

          {error && (
            <div style={{ fontSize: 11, color: '#E24B4A', marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 11,
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              borderRadius: 8,
              background: 'var(--blue)',
              color: '#fff',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}