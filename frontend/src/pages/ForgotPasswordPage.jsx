import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');

    if (!email.trim()) {
      setError('로그인 이메일을 입력하세요.');
      return;
    }

    try {
      setLoading(true);

      const res = await api.post('/auth/forgot-password', {
        email: email.trim(),
      });

      const data = res?.data ?? res;

      setMsg(data?.message || '등록된 비밀번호 재설정 이메일로 안내를 보냈습니다.');
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          '요청 실패'
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
            비밀번호 찾기
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            로그인 이메일을 입력하세요
          </div>
        </div>

        <form onSubmit={handle}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              로그인 이메일
            </label>
            <input
              type="email"
              placeholder="로그인 이메일 입력"
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

          {error ? (
            <div style={{ fontSize: 12, color: '#E24B4A', marginBottom: 12 }}>
              {error}
            </div>
          ) : null}

          {msg ? (
            <div style={{ fontSize: 12, color: '#3B6D11', marginBottom: 12 }}>
              {msg}
            </div>
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
            {loading ? '처리 중...' : '재설정 요청'}
          </button>
        </form>

        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <Link
            to="/login"
            style={{
              fontSize: 12,
              color: 'var(--blue)',
              textDecoration: 'none',
            }}
          >
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}