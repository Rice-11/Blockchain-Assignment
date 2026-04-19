// Analytics — aggregates live on-chain campaign data. No hardcoded series.
// Monthly buckets are derived from campaign deadlines, not a fake timeline.
function AnalyticsScreen() {
  const campaigns = CF.campaigns || [];
  const txs = CF.transactions || [];
  const stats = window.W3?.getAnalytics?.() || { totalRaised: 0, funded: 0, failed: 0, active: 0, totalCampaigns: 0, successRate: null, avgGoal: 0, myCreated: 0, myContributed: 0, myTotalContributed: 0 };

  // Monthly buckets: group campaigns by deadline month
  const monthly = {};
  campaigns.forEach(c => {
    const m = c.deadline.slice(0, 7); // YYYY-MM
    if (!monthly[m]) monthly[m] = { month: m, eth: 0, campaigns: 0 };
    monthly[m].eth += c.raised;
    monthly[m].campaigns += 1;
  });
  const monthlySeries = Object.values(monthly).sort((a, b) => (a.month > b.month ? 1 : -1));
  const maxEth = Math.max(...monthlySeries.map(m => m.eth), 1);
  const maxCamp = Math.max(...monthlySeries.map(m => m.campaigns), 1);

  // Status breakdown (replaces the hardcoded category pie)
  const statusBuckets = [
    { name: 'Active',  count: stats.active,  color: '#F4B942' },
    { name: 'Funded',  count: stats.funded,  color: '#6B9B7E' },
    { name: 'Failed',  count: stats.failed,  color: '#E74C3C' },
  ];
  const totalBucket = Math.max(1, statusBuckets.reduce((s, b) => s + b.count, 0));

  const SectionHeader = ({ title }) => (
    <div style={{ padding: '16px 20px 12px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: '1px solid #E8EAED' }}>{title}</div>
  );

  const Stat = (label, value) => (
    <div key={label} style={{ flex: 1, padding: '18px 16px', borderRight: '1px solid #E8EAED' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#2D3436', letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, background: 'rgba(248,249,250,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E8EAED', padding: '14px 20px', zIndex: 50 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#2D3436' }}>Analytics</div>
      </div>

      {/* Top stats — all from on-chain state */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E8EAED', background: '#F8F9FA' }}>
        {Stat('Total Raised', `${stats.totalRaised.toFixed(4)} ETH`)}
        {Stat('Campaigns', stats.totalCampaigns)}
        {Stat('Success Rate', stats.successRate == null ? '—' : `${stats.successRate}%`)}
        <div style={{ flex: 1, padding: '18px 16px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#2D3436', letterSpacing: '-0.5px' }}>{stats.avgGoal.toFixed(2)} ETH</div>
          <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>Avg. Goal</div>
        </div>
      </div>

      {/* Monthly ETH chart */}
      <SectionHeader title="ETH raised by deadline month" />
      <div style={{ background: '#F8F9FA', borderBottom: '1px solid #E8EAED', padding: '20px' }}>
        {monthlySeries.length === 0 ? (
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>No campaigns yet.</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {monthlySeries.map((m, i) => {
              const isLatest = i === monthlySeries.length - 1;
              return (
                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isLatest ? '#2D3436' : '#9CA3AF' }}>{m.eth.toFixed(2)}</div>
                  <div style={{ width: '100%', borderRadius: '3px 3px 0 0', height: `${(m.eth / maxEth) * 90}px`, background: isLatest ? '#2D3436' : '#E8EAED', minHeight: 2 }} />
                  <div style={{ fontSize: 10, color: '#9CA3AF' }}>{m.month.slice(5)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Campaign count chart */}
      <SectionHeader title="Campaigns by deadline month" />
      <div style={{ background: '#F8F9FA', borderBottom: '1px solid #E8EAED', padding: '20px' }}>
        {monthlySeries.length === 0 ? (
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>No campaigns yet.</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
            {monthlySeries.map((m, i) => {
              const isLatest = i === monthlySeries.length - 1;
              return (
                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isLatest ? '#2D3436' : '#9CA3AF' }}>{m.campaigns}</div>
                  <div style={{ width: '100%', borderRadius: '3px 3px 0 0', height: `${(m.campaigns / maxCamp) * 55}px`, background: isLatest ? '#2D3436' : '#E8EAED', minHeight: 2 }} />
                  <div style={{ fontSize: 10, color: '#9CA3AF' }}>{m.month.slice(5)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status breakdown */}
      <SectionHeader title="By status" />
      <div style={{ background: '#F8F9FA', borderBottom: '1px solid #E8EAED', padding: '18px 20px' }}>
        {statusBuckets.map(b => {
          const pct = Math.round((b.count / totalBucket) * 100);
          return (
            <div key={b.name} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: '#2D3436' }}>{b.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#2D3436' }}>{b.count} · {pct}%</span>
              </div>
              <div style={{ background: '#E8EAED', borderRadius: 99, height: 3 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: b.color, borderRadius: 99 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* My stats — per-account participation */}
      <SectionHeader title="My on-chain activity" />
      {[
        ['Campaigns created', stats.myCreated],
        ['Campaigns contributed', stats.myContributed],
        ['Total contributed', `${stats.myTotalContributed.toFixed(4)} ETH`],
        ['Activity rows', txs.length],
      ].map(([k, v], i, arr) => (
        <div key={k} style={{ padding: '13px 20px', borderBottom: i < arr.length - 1 ? '1px solid #E8EAED' : 'none', display: 'flex', justifyContent: 'space-between', background: '#F8F9FA' }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>{k}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#2D3436' }}>{v}</span>
        </div>
      ))}

      {campaigns.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF', fontSize: 13 }}>
          {window.W3?.connected ? 'No campaigns yet — analytics will populate once the first campaign exists.' : 'Connect MetaMask to load analytics.'}
        </div>
      )}
    </div>
  );
}

window.AnalyticsScreen = AnalyticsScreen;
