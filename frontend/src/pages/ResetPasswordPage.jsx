import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = useMemo(() => params.get('token') || '', [params]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');

    if (!token) {
      setError('재설정 토큰이 없습니다.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('새 비밀번호와 확인 비밀번호를 입력하세요.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setLoading(true);

      const res = await api.post('/auth/reset-password', {
        token,
        newPassword: password,
      });

      const data = res?.data ?? res;

      if (!data?.success) {
        throw new Error(data?.error || '비밀번호 재설정 실패');
      }

      setMsg('비밀번호가 재설정되었습니다. 잠시 후 로그인 페이지로 이동합니다.');

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          '비밀번호 재설정 실패'
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
          width: 420,
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 14,
          padding: 32,
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
            비밀번호 재설정
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            새 비밀번호를 입력하세요
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
              새 비밀번호
            </label>
            <input
              type="password"
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

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              새 비밀번호 확인
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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

          {error ? (
            <div style={{ fontSize: 12, color: '#E24B4A', marginBottom: 12 }}>{error}</div>
          ) : null}

          {msg ? (
            <div style={{ fontSize: 12, color: '#3B6D11', marginBottom: 12 }}>{msg}</div>
          ) : null}

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
            {loading ? '처리 중...' : '비밀번호 재설정'}
          </button>
        </form>

        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'none' }}>
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}