import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        email,
        password,
      });

      const data = res?.data || {};
      const token = data.token;
      const user = data.user;

      if (!token || !user) {
        throw new Error('로그인 응답이 올바르지 않습니다.');
      }

      setAuth(token, user);
      navigate('/orders');
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          '로그인에 실패했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f6f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          border: '1px solid #e5e7eb',
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>로그인</h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          셀러허브에 로그인하세요
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="email"
              style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}
            >
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 입력"
              autoComplete="username"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid #d1d5db',
                boxSizing: 'border-box',
                fontSize: 15,
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              htmlFor="password"
              style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}
            >
              비밀번호
            </label>

            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '12px 90px 12px 14px',
                  borderRadius: 10,
                  border: '1px solid #d1d5db',
                  boxSizing: 'border-box',
                  fontSize: 15,
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#2563eb',
                  fontWeight: 700,
                  padding: '4px 6px',
                }}
              >
                {showPassword ? '가리기' : '보기'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 20, textAlign: 'right' }}>
            <Link
              to="/forgot-password"
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              비밀번호 찾기
            </Link>
          </div>

          {error ? (
            <div
              style={{
                marginBottom: 16,
                color: '#dc2626',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px 14px',
              borderRadius: 10,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 800,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}