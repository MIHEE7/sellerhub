import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PLATFORM_META } from '../types/meta';
import api from '../services/api';
import s from './AccountsPage.module.css';

const PLATFORMS = [
  { value: 'naver',   label: '네이버 스마트스토어', extra: 'channel_id',  extraLabel: '채널 ID' },
  { value: 'coupang', label: '쿠팡',               extra: 'vendor_id',   extraLabel: 'Vendor ID' },
  { value: 'kakao',   label: '카카오 톡스토어',     extra: 'app_key',     extraLabel: '앱 키' },
  { value: '11st',    label: '11번가',              extra: null,          extraLabel: null },
  { value: 'auction', label: '옥션',               extra: null,          extraLabel: null },
  { value: 'gmarket', label: 'G마켓',              extra: null,          extraLabel: null },
];

const EMPTY_FORM = { platform: '', account_name: '', seller_id: '', client_id: '', client_secret: '', extra_field: '' };

export default function AccountsPage() {
  const qc = useQueryClient();
  const [modal, setModal]       = useState(null); // null | 'add' | 'edit'
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting]   = useState(false);

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => api.get('/accounts') });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? api.put(`/accounts/${editing.id}`, data)
      : api.post('/accounts', data),
    onSuccess: () => { qc.invalidateQueries(['accounts']); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/accounts/${id}`),
    onSuccess: () => qc.invalidateQueries(['accounts']),
  });

  const openAdd = (platform = '') => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, platform });
    setTestResult(null);
    setModal('add');
  };

  const openEdit = (acct) => {
    setEditing(acct);
    setForm({ platform: acct.platform, account_name: acct.account_name, seller_id: acct.seller_id || '', client_id: '', client_secret: '', extra_field: acct.extra_field || '' });
    setTestResult(null);
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setEditing(null); setTestResult(null); };

  const handleTest = async () => {
    if (!editing) return;
    setTesting(true);
    try {
      const res = await api.post(`/accounts/${editing.id}/test`);
      setTestResult(res);
    } catch { setTestResult({ ok: false, error: '연결 실패' }); }
    finally { setTesting(false); }
  };

  const grouped = {};
  PLATFORMS.forEach(({ value }) => { grouped[value] = []; });
  accounts.forEach((a) => { if (grouped[a.platform]) grouped[a.platform].push(a); });

  const platCfg = PLATFORMS.find((p) => p.value === form.platform);

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <div className={s.title}>계정 관리</div>
          <div className={s.sub}>플랫폼별 API 계정을 연결합니다</div>
        </div>
        <button className={s.addBtn} onClick={() => openAdd()}>+ 계정 추가</button>
      </div>

      {PLATFORMS.map(({ value, label }) => {
        const pm   = PLATFORM_META[value] || {};
        const accts = grouped[value] || [];
        return (
          <div key={value} className={s.platSection}>
            <div className={s.platHead}>
              <span className={s.platIco} style={{ background: pm.bg, color: pm.color }}>{pm.short}</span>
              <span className={s.platName}>{label}</span>
              <span className={s.apiLink} onClick={() => openAdd(value)}>+ 추가</span>
            </div>
            <div className={s.cardGrid}>
              {accts.map((a) => (
                <div key={a.id} className={`${s.acctCard} ${a.last_error ? s.error : s.ok}`}>
                  <div className={s.cardTop}>
                    <div>
                      <div className={s.cardName}>{a.account_name}</div>
                      <div className={s.cardId}>@{a.seller_id || '—'}</div>
                    </div>
                    <div className={s.status} style={{ color: a.last_error ? '#E24B4A' : '#3B6D11' }}>
                      <div className={s.statusDot} style={{ background: a.last_error ? '#E24B4A' : '#3B6D11' }} />
                      {a.last_error ? '오류' : '연결됨'}
                    </div>
                  </div>
                  <div className={s.field}><span className={s.fieldLbl}>API Key</span><span className={s.fieldVal}>{a.client_id_masked}</span></div>
                  {a.extra_field && <div className={s.field}><span className={s.fieldLbl}>Extra</span><span className={s.fieldVal}>{a.extra_field}</span></div>}
                  {a.last_error && <div className={s.errMsg}>{a.last_error}</div>}
                  <div className={s.cardActions}>
                    <button className={s.cBtn} onClick={() => openEdit(a)}>수정</button>
                    <button className={s.cBtn} onClick={async () => {
                      setTesting(true);
                      try { await api.post(`/accounts/${a.id}/test`); } catch {}
                      setTesting(false);
                      qc.invalidateQueries(['accounts']);
                    }}>테스트</button>
                    <button className={`${s.cBtn} ${s.danger}`} onClick={() => { if (confirm('삭제하시겠습니까?')) deleteMutation.mutate(a.id); }}>삭제</button>
                  </div>
                </div>
              ))}
              <div className={s.addCard} onClick={() => openAdd(value)}>+ 계정 추가</div>
            </div>
          </div>
        );
      })}

      {/* DISABLED PLATFORMS */}
      <div className={s.platSection}>
        <div className={s.platHead}>
          <span className={s.platIco} style={{ background: '#f0efe8', color: '#888' }}>!</span>
          <span className={s.platName} style={{ color: '#999' }}>API 미지원 플랫폼</span>
        </div>
        <div className={s.disabledRow}>
          <div className={s.disabledItem}><b>토스쇼핑</b> — 공개 API 없음, 판매자센터 수동 확인</div>
          <div className={s.disabledItem}><b>올웨이즈</b> — 공개 API 없음, 판매자센터 수동 확인</div>
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div className={s.modalBg} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className={s.modal}>
            <div className={s.modalHead}>
              <div className={s.modalTitle}>{modal === 'edit' ? '계정 수정' : '계정 추가'}</div>
              <button className={s.modalClose} onClick={closeModal}>✕</button>
            </div>

            <div className={s.formGroup}>
              <label className={s.label}>플랫폼 *</label>
              <select className={s.input} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} disabled={modal === 'edit'}>
                <option value="">선택하세요</option>
                {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <div className={s.formRow}>
              <div className={s.formGroup}>
                <label className={s.label}>계정 별명 *</label>
                <input className={s.input} value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="예: 메인몰" />
              </div>
              <div className={s.formGroup}>
                <label className={s.label}>판매자 ID</label>
                <input className={s.input} value={form.seller_id} onChange={(e) => setForm({ ...form, seller_id: e.target.value })} placeholder="판매자 아이디" />
              </div>
            </div>

            <div className={s.formGroup}>
              <label className={s.label}>Client ID *</label>
              <input className={s.input} value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} placeholder={modal === 'edit' ? '변경시에만 입력' : 'API Client ID'} />
            </div>

            <div className={s.formGroup}>
              <label className={s.label}>Client Secret *</label>
              <input className={s.input} type="password" value={form.client_secret} onChange={(e) => setForm({ ...form, client_secret: e.target.value })} placeholder={modal === 'edit' ? '변경시에만 입력' : 'API Secret Key'} />
              {modal === 'edit' && (
                <div className={s.testRow}>
                  <button className={s.testBtn} onClick={handleTest} disabled={testing}>{testing ? '테스트 중...' : '연결 테스트'}</button>
                  {testResult && (
                    <span style={{ fontSize: 11, color: testResult.ok ? '#3B6D11' : '#E24B4A' }}>
                      {testResult.ok ? '✓ 연결 성공' : `✕ ${testResult.error}`}
                    </span>
                  )}
                </div>
              )}
            </div>

            {platCfg?.extraLabel && (
              <div className={s.formGroup}>
                <label className={s.label}>{platCfg.extraLabel}</label>
                <input className={s.input} value={form.extra_field} onChange={(e) => setForm({ ...form, extra_field: e.target.value })} placeholder={platCfg.extraLabel} />
              </div>
            )}

            <div className={s.modalFooter}>
              <button className={s.cancelBtn} onClick={closeModal}>취소</button>
              <button className={s.saveBtn} onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
