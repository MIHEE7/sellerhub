import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store';
import { useFilterStore } from '../../store';
import { TYPE_META, PLATFORM_META, TYPE_ORDER } from '../../types/meta';
import api from '../../services/api';
import s from './Layout.module.css';

export default function Layout() {
  const logout     = useAuthStore((st) => st.logout);
  const navigate   = useNavigate();
  const setType    = useFilterStore((st) => st.setType);
  const setAcctId  = useFilterStore((st) => st.setAccountId);

  const { data: stats }    = useQuery({ queryKey: ['stats'],    queryFn: () => api.get('/notifications/stats'),   refetchInterval: 30_000 });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: () => api.get('/accounts'), refetchInterval: 60_000 });

  const handleLogout = () => { logout(); navigate('/login'); };

  // Group accounts by platform
  const grouped = {};
  (accounts || []).forEach((a) => {
    if (!grouped[a.platform]) grouped[a.platform] = [];
    grouped[a.platform].push(a);
  });

  return (
    <div className={s.shell}>
      {/* ── SIDEBAR ─────────────────────────────── */}
      <aside className={s.sidebar}>
        <div className={s.logo}>
          <div className={s.logoTitle}>셀러 허브</div>
          <div className={s.logoSub}>멀티 플랫폼 알림 관리</div>
        </div>

        {/* 알림 유형 */}
        <div className={s.secLabel}>알림 유형</div>
        <NavItem icon="🔔" label="전체 알림" count={stats?.total} onClick={() => { setType('all'); setAcctId('all'); navigate('/'); }} />
        {TYPE_ORDER.map((type) => {
          const m = TYPE_META[type];
          return (
            <NavItem
              key={type}
              icon={m.icon}
              label={m.label}
              count={stats?.byType?.[type]}
              color={m.color}
              onClick={() => { setType(type); setAcctId('all'); navigate('/'); }}
            />
          );
        })}

        {/* 플랫폼·계정 */}
        <div className={s.secLabel}>플랫폼 / 계정</div>
        {Object.entries(grouped).map(([plat, accts]) => {
          const pm = PLATFORM_META[plat] || { label: plat, color: '#888', bg: '#eee', short: plat[0].toUpperCase() };
          const cnt = accts.reduce((sum, a) => sum + (stats?.byPlatform?.[plat] || 0), 0);
          return (
            <PlatGroup key={plat} pm={pm} label={pm.label} count={cnt}>
              {accts.map((a) => (
                <div
                  key={a.id}
                  className={s.acctItem}
                  onClick={() => { setAcctId(a.id); setType('all'); navigate('/'); }}
                >
                  <span className={s.acctDot} style={{ background: a.last_error ? '#E24B4A' : pm.color }} />
                  {a.account_name}
                </div>
              ))}
            </PlatGroup>
          );
        })}

        {/* 하단 메뉴 */}
        <div className={s.bottomNav}>
          <NavLink to="/accounts" className={({ isActive }) => `${s.navLink} ${isActive ? s.active : ''}`}>
            계정 관리
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `${s.navLink} ${isActive ? s.active : ''}`}>
            알림 설정
          </NavLink>
          <button className={s.logoutBtn} onClick={handleLogout}>로그아웃</button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────── */}
      <main className={s.main}>
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ icon, label, count, color, onClick }) {
  return (
    <div className={s.navItem} onClick={onClick}>
      <span className={s.navIcon}>{icon}</span>
      <span className={s.navLabel}>{label}</span>
      {count > 0 && (
        <span className={s.navBadge} style={{ background: color ? color + '20' : '#FCEBEB', color: color || '#993C1D' }}>
          {count}
        </span>
      )}
    </div>
  );
}

function PlatGroup({ pm, label, count, children }) {
  return (
    <div className={s.platGroup}>
      <div className={s.platHeader}>
        <span className={s.platIco} style={{ background: pm.bg, color: pm.color }}>{pm.short}</span>
        <span className={s.platName}>{label}</span>
        {count > 0 && <span className={s.platCount} style={{ color: pm.color }}>{count}건</span>}
      </div>
      <div className={s.platAccts}>{children}</div>
    </div>
  );
}
