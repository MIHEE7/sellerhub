export const TYPE_META = {
  order:    { label: '주문',   color: '#3B6D11', bg: '#EAF3DE', icon: '✓' },
  cancel:   { label: '취소',   color: '#993C1D', bg: '#FCEBEB', icon: '✕' },
  refund:   { label: '반품',   color: '#854F0B', bg: '#FAEEDA', icon: '↩' },
  exchange: { label: '교환',   color: '#185FA5', bg: '#E6F1FB', icon: '↔' },
  inquiry:  { label: '문의',   color: '#3C3489', bg: '#EEEDFE', icon: '?' },
};

export const PLATFORM_META = {
  naver:   { label: '스마트스토어', color: '#3B6D11', bg: '#EAF3DE', short: 'N' },
  coupang: { label: '쿠팡',        color: '#993C1D', bg: '#FCEBEB', short: 'C' },
  kakao:   { label: '톡스토어',    color: '#854F0B', bg: '#FAEEDA', short: 'K' },
  '11st':  { label: '11번가',      color: '#185FA5', bg: '#E6F1FB', short: '11' },
  auction: { label: '옥션',        color: '#534AB7', bg: '#EEEDFE', short: 'A' },
  gmarket: { label: 'G마켓',       color: '#3B6D11', bg: '#EAF3DE', short: 'G' },
};

export const TYPE_ORDER = ['order', 'cancel', 'refund', 'exchange', 'inquiry'];

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export function formatAmount(n) {
  if (!n) return null;
  return Number(n).toLocaleString('ko-KR') + '원';
}
