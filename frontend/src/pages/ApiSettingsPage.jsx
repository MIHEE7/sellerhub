import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/common/Layout';
import api from '../services/api';

const emptyFormByPlatform = {
  naver: { account_name: '', is_active: true, client_id: '', client_secret: '' },
  coupang: { account_name: '', is_active: true, access_key: '', secret_key: '', vendor_id: '' },
  talkstore: { account_name: '', is_active: true, client_id: '', client_secret: '' },
  elevenst: { account_name: '', is_active: true, access_key: '' },
  cafe24: { account_name: '', is_active: true, vendor_id: '', access_key: '' },
};

const titles = {
  naver: '네이버 커머스 API',
  coupang: '쿠팡 Wing API',
  talkstore: '톡스토어 API',
  elevenst: '11번가 API',
  cafe24: '카페24 API',
};

function PlatformCard({ title, children }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
      }}
    >
      <h2 style={{ margin: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 13, color: '#6b7280' }}>{label}</div>
      <input
        {...props}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 10,
          border: '1px solid #d1d5db',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

export default function ApiSettingsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingMsg, setSavingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [forms, setForms] = useState(() => ({
    naver: [{ ...emptyFormByPlatform.naver }],
    coupang: [{ ...emptyFormByPlatform.coupang }],
    talkstore: [{ ...emptyFormByPlatform.talkstore }],
    elevenst: [{ ...emptyFormByPlatform.elevenst }],
    cafe24: [{ ...emptyFormByPlatform.cafe24 }],
  }));

  const grouped = useMemo(() => {
    const result = {
      naver: [],
      coupang: [],
      talkstore: [],
      elevenst: [],
      cafe24: [],
    };

    items.forEach((item) => {
      if (result[item.platform]) result[item.platform].push(item);
    });

    return result;
  }, [items]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/integrations');
      const data = res?.data ?? [];
      setItems(data);

      setForms({
        naver: data.filter((v) => v.platform === 'naver').map(normalize) || [{ ...emptyFormByPlatform.naver }],
        coupang: data.filter((v) => v.platform === 'coupang').map(normalize) || [{ ...emptyFormByPlatform.coupang }],
        talkstore: data.filter((v) => v.platform === 'talkstore').map(normalize) || [{ ...emptyFormByPlatform.talkstore }],
        elevenst: data.filter((v) => v.platform === 'elevenst').map(normalize) || [{ ...emptyFormByPlatform.elevenst }],
        cafe24: data.filter((v) => v.platform === 'cafe24').map(normalize) || [{ ...emptyFormByPlatform.cafe24 }],
      });
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || err.message || '불러오기에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  function normalize(item) {
    return {
      id: item.id,
      account_name: item.account_name || '',
      is_active: item.is_active ?? true,
      client_id: item.client_id || '',
      client_secret: item.client_secret || '',
      access_key: item.access_key || '',
      secret_key: item.secret_key || '',
      vendor_id: item.vendor_id || '',
    };
  }

  const addRow = (platform) => {
    setForms((prev) => ({
      ...prev,
      [platform]: [...prev[platform], { ...emptyFormByPlatform[platform] }],
    }));
  };

  const removeRow = async (platform, idx) => {
    const target = forms[platform][idx];

    if (target?.id) {
      try {
        await api.delete(`/integrations/${target.id}`);
      } catch (err) {
        setErrorMsg(err?.response?.data?.error || err.message || '삭제에 실패했습니다.');
        return;
      }
    }

    const next = [...forms[platform]];
    next.splice(idx, 1);

    setForms((prev) => ({
      ...prev,
      [platform]: next.length ? next : [{ ...emptyFormByPlatform[platform] }],
    }));

    setSavingMsg('삭제되었습니다.');
    setErrorMsg('');
    load();
  };

  const updateField = (platform, idx, key, value) => {
    setForms((prev) => {
      const next = [...prev[platform]];
      next[idx] = { ...next[idx], [key]: value };
      return { ...prev, [platform]: next };
    });
  };

  const savePlatform = async (platform) => {
    try {
      setSavingMsg('');
      setErrorMsg('');

      for (const row of forms[platform]) {
        const payload = {
          platform,
          account_name: row.account_name,
          is_active: row.is_active,
          client_id: row.client_id,
          client_secret: row.client_secret,
          access_key: row.access_key,
          secret_key: row.secret_key,
          vendor_id: row.vendor_id,
        };

        if (row.id) {
          await api.put(`/integrations/${row.id}`, payload);
        } else if (row.account_name) {
          await api.post('/integrations', payload);
        }
      }

      setSavingMsg(`${titles[platform]} 저장 완료`);
      load();
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || err.message || '저장에 실패했습니다.');
    }
  };

  const renderBlock = (platform) => (
    <PlatformCard title={titles[platform]}>
      {forms[platform].map((row, idx) => (
        <div
          key={`${platform}-${idx}`}
          style={{
            padding: 16,
            border: '1px solid #e5e7eb',
            borderRadius: 14,
            marginBottom: 16,
            background: '#f9fafb',
          }}
        >
          <Input
            label="계정명"
            value={row.account_name}
            onChange={(e) => updateField(platform, idx, 'account_name', e.target.value)}
            placeholder="예: 쿠팡본계정, 네이버메인"
          />

          <div style={{ marginBottom: 14 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#6b7280' }}>사용 여부</div>
            <select
              value={row.is_active ? 'Y' : 'N'}
              onChange={(e) => updateField(platform, idx, 'is_active', e.target.value === 'Y')}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid #d1d5db',
                boxSizing: 'border-box',
              }}
            >
              <option value="Y">사용</option>
              <option value="N">미사용</option>
            </select>
          </div>

          {platform === 'naver' && (
            <>
              <Input
                label="Client ID"
                value={row.client_id}
                onChange={(e) => updateField(platform, idx, 'client_id', e.target.value)}
              />
              <Input
                label="Client Secret"
                value={row.client_secret}
                onChange={(e) => updateField(platform, idx, 'client_secret', e.target.value)}
              />
            </>
          )}

          {platform === 'coupang' && (
            <>
              <Input
                label="Access Key"
                value={row.access_key}
                onChange={(e) => updateField(platform, idx, 'access_key', e.target.value)}
              />
              <Input
                label="Secret Key"
                value={row.secret_key}
                onChange={(e) => updateField(platform, idx, 'secret_key', e.target.value)}
              />
              <Input
                label="Vendor ID"
                value={row.vendor_id}
                onChange={(e) => updateField(platform, idx, 'vendor_id', e.target.value)}
              />
            </>
          )}

          {platform === 'talkstore' && (
            <>
              <Input
                label="App Key"
                value={row.client_id}
                onChange={(e) => updateField(platform, idx, 'client_id', e.target.value)}
              />
              <Input
                label="Admin Key"
                value={row.client_secret}
                onChange={(e) => updateField(platform, idx, 'client_secret', e.target.value)}
              />
            </>
          )}

          {platform === 'elevenst' && (
            <Input
              label="API Key"
              value={row.access_key}
              onChange={(e) => updateField(platform, idx, 'access_key', e.target.value)}
            />
          )}

          {platform === 'cafe24' && (
            <>
              <Input
                label="Mall ID"
                value={row.vendor_id}
                onChange={(e) => updateField(platform, idx, 'vendor_id', e.target.value)}
              />
              <Input
                label="Access Token"
                value={row.access_key}
                onChange={(e) => updateField(platform, idx, 'access_key', e.target.value)}
              />
            </>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => removeRow(platform, idx)}
              style={{
                border: 'none',
                background: '#ef4444',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: 10,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              삭제
            </button>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={() => addRow(platform)}
          style={{
            border: 'none',
            background: '#2563eb',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: 10,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          계정 추가
        </button>

        <button
          type="button"
          onClick={() => savePlatform(platform)}
          style={{
            border: 'none',
            background: '#111827',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: 10,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          저장
        </button>
      </div>
    </PlatformCard>
  );

  return (
    <Layout
      title="API 설정"
      subtitle="플랫폼 계정을 추가하고 API 키를 저장합니다."
    >
      {loading ? <div>불러오는 중...</div> : null}
      {savingMsg ? <div style={{ color: '#15803d', marginBottom: 16 }}>{savingMsg}</div> : null}
      {errorMsg ? <div style={{ color: '#dc2626', marginBottom: 16 }}>{errorMsg}</div> : null}

      {!loading && (
        <>
          {renderBlock('naver')}
          {renderBlock('coupang')}
          {renderBlock('talkstore')}
          {renderBlock('elevenst')}
          {renderBlock('cafe24')}
        </>
      )}
    </Layout>
  );
}