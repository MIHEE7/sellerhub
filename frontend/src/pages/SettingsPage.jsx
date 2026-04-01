import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import s from './SettingsPage.module.css';

export default function SettingsPage() {
  const qc = useQueryClient();

  const { data: raw } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res?.data ?? res;
    },
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res?.data ?? res;
    },
  });

  const [cfg, setCfg] = useState(null);
  const [saved, setSaved] = useState(false);

  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMsg, setRecoveryMsg] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    if (raw) setCfg(raw);
  }, [raw]);

  useEffect(() => {
    if (me?.recovery_email) {
      setRecoveryEmail(me.recovery_email);
    } else {
      setRecoveryEmail('');
    }
  }, [me]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.put('/settings', data);
      return res?.data ?? res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const recoveryMutation = useMutation({
    mutationFn: async (email) => {
      const res = await api.put('/auth/recovery-email', {
        recoveryEmail: email,
      });
      return res?.data ?? res;
    },
    onSuccess: (data) => {
      setRecoveryMsg('비밀번호 재설정 이메일이 저장되었습니다.');
      setRecoveryError('');
      setRecoveryEmail(data?.recovery_email || recoveryEmail);
      qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err) => {
      setRecoveryMsg('');
      setRecoveryError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          '저장 실패'
      );
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return res?.data ?? res;
    },
    onSuccess: () => {
      setPwMsg('비밀번호가 변경되었습니다.');
      setPwError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => {
      setPwMsg('');
      setPwError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          '비밀번호 변경 실패'
      );
    },
  });

  if (!cfg) return <div className={s.loading}>불러오는 중...</div>;

  const set = (key, val) => setCfg((c) => ({ ...c, [key]: val }));
  const toggle = (key) => set(key, !cfg[key]);

  const handleSaveRecoveryEmail = () => {
    setRecoveryMsg('');
    setRecoveryError('');

    if (!recoveryEmail.trim()) {
      setRecoveryError('비밀번호 재설정 이메일을 입력하세요.');
      return;
    }

    recoveryMutation.mutate(recoveryEmail.trim());
  };

  const handleChangePassword = () => {
    setPwMsg('');
    setPwError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('현재 비밀번호, 새 비밀번호, 새 비밀번호 확인을 모두 입력하세요.');
      return;
    }

    if (newPassword.length < 6) {
      setPwError('새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError('새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <div className={s.title}>알림 설정</div>
          <div className={s.sub}>수신 채널, 유형별 설정, 방해금지 시간을 관리합니다</div>
        </div>
        <button
          className={s.saveBtn}
          onClick={() => saveMutation.mutate(cfg)}
          disabled={saveMutation.isPending}
          style={saved ? { background: '#3B6D11' } : {}}
        >
          {saved ? '✓ 저장됨' : saveMutation.isPending ? '저장 중...' : '설정 저장'}
        </button>
      </div>

      <Section title="수신 채널" sub="알림을 받을 방법을 선택하세요">
        <SettingRow icon="📱" bg="#E6F1FB" col="#185FA5" name="앱 푸시 알림">
          <Toggle on={cfg.push_enabled} onClick={() => toggle('push_enabled')} />
        </SettingRow>

        <SettingRow icon="💬" bg="#EAF3DE" col="#3B6D11" name="카카오 알림톡">
          <Toggle on={cfg.kakao_enabled} onClick={() => toggle('kakao_enabled')} />
        </SettingRow>
      </Section>

      <Section title="계정 정보" sub="로그인 이메일은 현재 계정 기준으로 표시됩니다">
        <SettingRow icon="👤" bg="#F3F4F6" col="#374151" name="로그인 이메일">
          <div style={{ fontSize: 13, color: '#111827' }}>{me?.email || '-'}</div>
        </SettingRow>
      </Section>

      <Section title="비밀번호 재설정 이메일" sub="비밀번호 찾기 시 이 이메일로 재설정 안내를 보냅니다">
        <SettingRow icon="📧" bg="#E6F1FB" col="#185FA5" name="재설정 이메일 등록 / 수정">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
            <input
              type="email"
              placeholder="비밀번호 재설정 이메일 입력"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              className={s.timeInput}
            />
            <button
              onClick={handleSaveRecoveryEmail}
              className={s.saveBtn}
              disabled={recoveryMutation.isPending}
            >
              {recoveryMutation.isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </SettingRow>

        {(recoveryError || recoveryMsg) && (
          <div style={{ paddingTop: 8 }}>
            {recoveryError ? (
              <div style={{ fontSize: 12, color: '#E24B4A' }}>{recoveryError}</div>
            ) : null}
            {recoveryMsg ? (
              <div style={{ fontSize: 12, color: '#3B6D11' }}>{recoveryMsg}</div>
            ) : null}
          </div>
        )}
      </Section>

      <Section title="비밀번호 변경" sub="로그인된 계정의 비밀번호를 변경합니다">
        <SettingRow icon="🔒" bg="#E6F1FB" col="#185FA5" name="현재 비밀번호">
          <input
            type="password"
            placeholder="현재 비밀번호"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={s.timeInput}
          />
        </SettingRow>

        <SettingRow icon="🔑" bg="#EAF3DE" col="#3B6D11" name="새 비밀번호">
          <input
            type="password"
            placeholder="새 비밀번호"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={s.timeInput}
          />
        </SettingRow>

        <SettingRow icon="✅" bg="#FFF4E5" col="#B26A00" name="새 비밀번호 확인">
          <input
            type="password"
            placeholder="새 비밀번호 다시 입력"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={s.timeInput}
          />
        </SettingRow>

        <div style={{ paddingTop: 8 }}>
          {pwError ? (
            <div style={{ fontSize: 12, color: '#E24B4A', marginBottom: 10 }}>{pwError}</div>
          ) : null}

          {pwMsg ? (
            <div style={{ fontSize: 12, color: '#3B6D11', marginBottom: 10 }}>{pwMsg}</div>
          ) : null}

          <button
            onClick={handleChangePassword}
            className={s.saveBtn}
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? '변경 중...' : '비밀번호 변경'}
          </button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, sub, children }) {
  return (
    <div className={s.section}>
      <div className={s.secHead}>
        <div className={s.secTitle}>{title}</div>
        {sub && <div className={s.secSub}>{sub}</div>}
      </div>
      <div className={s.secBody}>{children}</div>
    </div>
  );
}

function SettingRow({ icon, bg, col, name, children }) {
  return (
    <div className={s.sRow}>
      {icon && (
        <div className={s.sIco} style={{ background: bg, color: col }}>
          {icon}
        </div>
      )}
      <div className={s.sInfo}>
        <div className={s.sName}>{name}</div>
      </div>
      <div className={s.sRight}>{children}</div>
    </div>
  );
}

function Toggle({ on, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        minWidth: 52,
        textAlign: 'center',
        padding: '8px 12px',
        borderRadius: 999,
        background: on ? '#3B6D11' : '#D9DDE3',
        color: '#fff',
        fontSize: 12,
        fontWeight: 700,
        userSelect: 'none',
      }}
    >
      {on ? 'ON' : 'OFF'}
    </div>
  );
}