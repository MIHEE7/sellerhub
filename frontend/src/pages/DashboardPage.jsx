import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFilterStore } from '../store';
import { TYPE_META, PLATFORM_META, timeAgo, formatAmount } from '../types/meta';
import api from '../services/api';
import s from './DashboardPage.module.css';

export default function DashboardPage() {
  const { type, accountId, status, setType, setStatus } = useFilterStore();
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', type, accountId, status],
    queryFn: () => api.get('/notifications', { params: {
      ...(type !== 'all' && { type }),
      ...(accountId !== 'all' && { account_id: accountId }),
      ...(status !== 'all' && { status }),
    }}),
    refetchInterval: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/notifications/stats'),
    refetchInterval: 30_000,
  });

  const doneMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/done`),
    onSuccess: () => { qc.invalidateQueries(['notifications']); qc.invalidateQueries(['stats']); },
  });

  const doneAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/done-all', {
      ...(type !== 'all' && { type }),
      ...(accountId !== 'all' && { account_id: accountId }),
    }),
    onSuccess: () => { qc.invalidateQueries(['notifications']); qc.invalidateQueries(['stats']); },
  });

  // Group by date
  const today = new Date().toDateString();
  const todayItems = notifications.filter((n) => new Date(n.occurred_at).toDateString() === today);
  const olderItems = notifications.filter((n) => new Date(n.occurred_at).toDateString() !== today);

  return (
    <div className={s.page}>
      {/* ── TOPBAR ───────────────────────────────── */}
      <div className={s.topbar}>
        <div className={s.topTitle}>전체 알림</div>
        <div className={s.typeTabs}>
          {['all','order','cancel','refund','exchange','inquiry'].map((t) => (
            <button
              key={t}
              className={`${s.typeTab} ${type === t ? s.active : ''}`}
              onClick={() => setType(t)}
            >
              {t === 'all' ? '전체' : TYPE_META[t].label}
            </button>
          ))}
        </div>
        <div className={s.statusTabs}>
          {[['all','전체'],['pending','미처리'],['done','처리완료']].map(([v,l]) => (
            <button key={v} className={`${s.statusTab} ${status === v ? s.active : ''}`} onClick={() => setStatus(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className={s.body}>
        {/* ── NOTIFICATION LIST ─────────────────── */}
        <div className={s.list}>
          {isLoading && <div className={s.empty}>불러오는 중...</div>}
          {!isLoading && notifications.length === 0 && (
            <div className={s.empty}>✓ 알림이 없습니다</div>
          )}

          {todayItems.length > 0 && (
            <>
              <div className={s.dateLbl}>오늘</div>
              {todayItems.map((n) => <NotifCard key={n.id} n={n} onDone={() => doneMutation.mutate(n.id)} />)}
            </>
          )}
          {olderItems.length > 0 && (
            <>
              <div className={s.dateLbl}>이전</div>
              {olderItems.map((n) => <NotifCard key={n.id} n={n} onDone={() => doneMutation.mutate(n.id)} />)}
            </>
          )}
        </div>

        {/* ── STATS PANEL ───────────────────────── */}
        <div className={s.statsPanel}>
          <StatCard label="전체 미처리" value={stats?.total ?? 0} unit="건" />
          {['order','cancel','refund','exchange','inquiry'].map((t) => (
            <StatCard
              key={t}
              label={TYPE_META[t].label}
              value={stats?.byType?.[t] ?? 0}
              color={TYPE_META[t].color}
              total={stats?.total}
            />
          ))}
          <div className={s.platStats}>
            <div className={s.platStatsTitle}>플랫폼별</div>
            {Object.entries(stats?.byPlatform || {}).map(([plat, cnt]) => {
              const pm = PLATFORM_META[plat];
              return (
                <div key={plat} className={s.platRow}>
                  <span style={{ color: pm?.color }}>{pm?.label || plat}</span>
                  <span style={{ color: pm?.color, fontWeight: 600 }}>{cnt}건</span>
                </div>
              );
            })}
          </div>
          {stats?.total > 0 && (
            <button className={s.doneAllBtn} onClick={() => doneAllMutation.mutate()}>
              일괄 처리완료
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NotifCard({ n, onDone }) {
  const tm = TYPE_META[n.event_type] || {};
  const pm = PLATFORM_META[n.platform] || {};
  const isPending = n.status === 'pending';

  return (
    <div className={`${s.card} ${isPending ? s.unread : ''}`}
         style={isPending ? { borderLeftColor: tm.color } : {}}>
      {isPending && <div className={s.udot} style={{ background: tm.color }} />}
      {!isPending && <div className={s.udotSpace} />}
      <div className={s.cardIcon} style={{ background: tm.bg, color: tm.color }}>{tm.icon}</div>
      <div className={s.cardBody}>
        <div className={s.cardTop}>
          <span className={s.typePill} style={{ background: tm.bg, color: tm.color }}>{tm.label}</span>
          <span className={s.platPill} style={{ background: pm.bg, color: pm.color }}>{pm.label || n.platform}</span>
          <span className={s.acctName}>{n.account_name}</span>
        </div>
        <div className={s.cardTitle}>{n.title}</div>
        <div className={s.cardDesc}>
          {n.external_id}
          {n.customer_name && ` · ${n.customer_name}`}
          {n.amount && ` · ${formatAmount(n.amount)}`}
          {n.reason && ` · ${n.reason}`}
        </div>
        {isPending && (
          <div className={s.cardActions}>
            <button className={s.doneBtn} onClick={onDone}>처리완료</button>
          </div>
        )}
        {!isPending && <div className={s.doneTag}>처리완료</div>}
      </div>
      <div className={s.cardTime}>{timeAgo(n.occurred_at)}</div>
    </div>
  );
}

function StatCard({ label, value, unit, color, total }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className={s.statCard}>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue} style={color ? { color } : {}}>{value}{unit || ''}</div>
      {total !== undefined && (
        <div className={s.miniBar}>
          <div className={s.miniFill} style={{ width: pct + '%', background: color }} />
        </div>
      )}
    </div>
  );
}
