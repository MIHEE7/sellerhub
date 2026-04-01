import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const PLATFORM_CONFIG = {
  naver: {
    title: '네이버 커머스 API',
    addLabel: '네이버 계정 추가',
    fields: [
      { key: 'client_id', label: 'Client ID' },
      { key: 'client_secret', label: 'Client Secret' },
    ],
  },
  coupang: {
    title: '쿠팡 Wing API',
    addLabel: '쿠팡 계정 추가',
    fields: [
      { key: 'access_key', label: 'Access Key' },
      { key: 'secret_key', label: 'Secret Key' },
      { key: 'vendor_id', label: 'Vendor ID' },
    ],
  },
  kakao: {
    title: '카카오 API',
    addLabel: '카카오 계정 추가',
    fields: [
      { key: 'client_id', label: 'App Key' },
      { key: 'client_secret', label: 'Admin Key' },
    ],
  },
  elevenst: {
    title: '11번가 API',
    addLabel: '11번가 계정 추가',
    fields: [
      { key: 'access_key', label: 'API Key' },
    ],
  },
  gmarket: {
    title: '옥션 / 지마켓 API',
    addLabel: '옥션/지마켓 계정 추가',
    fields: [
      { key: 'access_key', label: 'API Key' },
      { key: 'secret_key', label: 'Secret Key' },
    ],
  },
  toss: {
    title: '토스 API',
    addLabel: '토스 계정 추가',
    fields: [
      { key: 'access_key', label: 'Client Key' },
      { key: 'secret_key', label: 'Secret Key' },
    ],
  },
  allways: {
    title: '올웨이즈 API',
    addLabel: '올웨이즈 계정 추가',
    fields: [
      { key: 'access_key', label: 'Access Key' },
      { key: 'secret_key', label: 'Secret Key' },
    ],
  },
};

const PLATFORM_ORDER = ['naver', 'coupang', 'kakao', 'elevenst', 'gmarket', 'toss', 'allways'];

function createEmptyItem(platform) {
  return {
    id: null,
    platform,
    account_name: '',
    client_id: '',
    client_secret: '',
    access_key: '',
    secret_key: '',
    vendor_id: '',
    is_active: true,
  };
}

export default function ApiSettingsPage() {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState({});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const { data: list = [] } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const res = await api.get('/integrations');
      return res?.data ?? [];
    },
  });

  const grouped = useMemo(() => {
    const map = {};

    for (const platform of PLATFORM_ORDER) {
      map[platform] = [];
    }

    for (const item of list) {
      if (!map[item.platform]) {
        map[item.platform] = [];
      }

      map[item.platform].push({
        id: item.id,
        platform: item.platform,
        account_name: item.account_name || '',
        client_id: item.client_id || '',
        client_secret: item.client_secret || '',
        access_key: item.access_key || '',
        secret_key: item.secret_key || '',
        vendor_id: item.vendor_id || '',
        is_active: item.is_active ?? true,
      });
    }

    for (const platform of PLATFORM_ORDER) {
      if (!map[platform] || map[platform].length === 0) {
        map[platform] = [createEmptyItem(platform)];
      }
    }

    return map;
  }, [list]);

  useEffect(() => {
    setDrafts(JSON.parse(JSON.stringify(grouped)));
  }, [grouped]);

  const saveMutation = useMutation({
    mutationFn: async (item) => {
      if (item.id) {
        const res = await api.put(`/integrations/${item.id}`, item);
        return res?.data ?? res;
      }
      const res = await api.post('/integrations', item);
      return res?.data ?? res;
    },
    onSuccess: () => {
      setMsg('API 설정이 저장되었습니다.');
      setError('');
      qc.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (err) => {
      setMsg('');
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          '저장 실패'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/integrations/${id}`);
      return res?.data ?? res;
    },
    onSuccess: () => {
      setMsg('계정이 삭제되었습니다.');
      setError('');
      qc.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (err) => {
      setMsg('');
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          '삭제 실패'
      );
    },
  });

  const setValue = (platform, index, key, value) => {
    setDrafts((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[platform][index][key] = value;
      return next;
    });
  };

  const addAccount = (platform) => {
    setDrafts((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[platform].push(createEmptyItem(platform));
      return next;
    });
  };

  const removeLocalAccount = (platform, index) => {
    setDrafts((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[platform].splice(index, 1);
      if (next[platform].length === 0) {
        next[platform].push(createEmptyItem(platform));
      }
      return next;
    });
  };

  const handleSave = (platform, index) => {
    setMsg('');
    setError('');

    const item = drafts[platform][index];

    if (!item.account_name.trim()) {
      setError('계정명을 입력하세요.');
      return;
    }

    saveMutation.mutate({
      id: item.id,
      platform: item.platform,
      account_name: item.account_name.trim(),
      client_id: item.client_id,
      client_secret: item.client_secret,
      access_key: item.access_key,
      secret_key: item.secret_key,
      vendor_id: item.vendor_id,
      is_active: item.is_active,
    });
  };

  const handleDelete = (platform, index) => {
    setMsg('');
    setError('');

    const item = drafts[platform][index];

    if (!item.id) {
      removeLocalAccount(platform, index);
      return;
    }

    deleteMutation.mutate(item.id);
  };

  const reloadFromServer = () => {
    setDrafts(JSON.parse(JSON.stringify(grouped)));
    setMsg('서버값으로 다시 불러왔습니다.');
    setError('');
  };

  return (
    <div style={{ padding: 24, background: '#f5f6f8', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>API 설정</h1>
        <div style={{ color: '#6b7280', marginBottom: 24 }}>
          마켓 API 정보를 등록하고 수정합니다
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <button onClick={reloadFromServer} style={topButtonStyle('#374151')}>
            서버값 다시 불러오기
          </button>

          {PLATFORM_ORDER.map((platform) => (
            <button
              key={platform}
              onClick={() => addAccount(platform)}
              style={topButtonStyle(platformColor(platform))}
            >
              {PLATFORM_CONFIG[platform].addLabel}
            </button>
          ))}
        </div>

        {error ? <div style={{ color: '#dc2626', marginBottom: 16 }}>{error}</div> : null}
        {msg ? <div style={{ color: '#15803d', marginBottom: 16 }}>{msg}</div> : null}

        {PLATFORM_ORDER.map((platform) => (
          <PlatformSection
            key={platform}
            title={PLATFORM_CONFIG[platform].title}
            platform={platform}
            items={drafts[platform] || [createEmptyItem(platform)]}
            fields={PLATFORM_CONFIG[platform].fields}
            setValue={setValue}
            onSave={handleSave}
            onDelete={handleDelete}
            savePending={saveMutation.isPending}
            deletePending={deleteMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function PlatformSection({
  title,
  platform,
  items,
  fields,
  setValue,
  onSave,
  onDelete,
  savePending,
  deletePending,
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>{title}</div>

      {items.map((item, index) => (
        <div
          key={item.id || `${platform}-${index}`}
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>계정명</label>
            <input
              type="text"
              value={item.account_name}
              onChange={(e) => setValue(platform, index, 'account_name', e.target.value)}
              placeholder="예: 네이버1, 네이버메인, 쿠팡A"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>사용 여부</label>
            <select
              value={item.is_active ? 'Y' : 'N'}
              onChange={(e) => setValue(platform, index, 'is_active', e.target.value === 'Y')}
              style={inputStyle}
            >
              <option value="Y">사용</option>
              <option value="N">사용 안함</option>
            </select>
          </div>

          {fields.map((field) => (
            <div key={field.key} style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{field.label}</label>
              <input
                type="text"
                value={item[field.key] || ''}
                onChange={(e) => setValue(platform, index, field.key, e.target.value)}
                style={inputStyle}
              />
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              onClick={() => onSave(platform, index)}
              disabled={savePending}
              style={buttonStyle('#2563eb')}
            >
              {savePending ? '저장 중...' : '저장'}
            </button>

            <button
              onClick={() => onDelete(platform, index)}
              disabled={deletePending}
              style={buttonStyle('#dc2626')}
            >
              {deletePending ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function platformColor(platform) {
  switch (platform) {
    case 'naver':
      return '#16a34a';
    case 'coupang':
      return '#2563eb';
    case 'kakao':
      return '#f59e0b';
    case 'elevenst':
      return '#dc2626';
    case 'gmarket':
      return '#7c3aed';
    case 'toss':
      return '#0ea5e9';
    case 'allways':
      return '#ec4899';
    default:
      return '#374151';
  }
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  color: '#6b7280',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  boxSizing: 'border-box',
};

const buttonStyle = (bg) => ({
  padding: '10px 16px',
  border: 'none',
  borderRadius: 8,
  background: bg,
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
});

const topButtonStyle = (bg) => ({
  padding: '10px 14px',
  border: 'none',
  borderRadius: 8,
  background: bg,
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
});