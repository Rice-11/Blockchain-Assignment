// Explore — browsable list of every campaign on-chain. Filter is by status
// (active / funded / failed) rather than a fake category, because the
// Crowdfunding contract has no category field. Search matches title + description.
const { useState: useEX } = React;

function ExploreScreen() {
  const [filter, setExFilter] = useEX('all');
  const [contributeTarget, setContributeTarget] = useEX(null);
  const [detailTarget, setDetailTarget] = useEX(null);
  const [showCreate, setShowCreate] = useEX(false);
  const [search, setSearch] = useEX('');

  const filters = ['all', 'active', 'funded', 'failed'];
  const allCampaigns = CF.campaigns || [];
  const campaigns = allCampaigns.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, background: 'rgba(248,249,250,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E8EAED', padding: '14px 20px', zIndex: 50 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#2D3436', marginBottom: 12 }}>Explore</div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns..."
          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #E8EAED', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#2D3436', background: '#F8F9FA', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* Status filter pills */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #E8EAED', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', background: '#F8F9FA' }}>
        {filters.map(c => (
          <button key={c} onClick={() => setExFilter(c)} style={{
            padding: '5px 12px', borderRadius: 6, border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500, transition: 'all 0.1s',
            background: filter === c ? '#2D3436' : 'transparent',
            color: filter === c ? '#F8F9FA' : '#6B7280',
            borderColor: filter === c ? '#2D3436' : '#E8EAED',
          }}>{c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}</button>
        ))}
        <button onClick={() => setShowCreate(true)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #E8EAED', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500, background: 'transparent', color: '#9CA3AF', marginLeft: 'auto' }}>+ Launch</button>
      </div>

      <div style={{ padding: '10px 20px', borderBottom: '1px solid #E8EAED', fontSize: 11, color: '#9CA3AF', background: '#F8F9FA' }}>
        {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} {filter !== 'all' ? `· ${filter}` : ''}
      </div>

      {campaigns.map(c => {
        const pct = Math.min(100, Math.round((c.raised / c.goal) * 100));
        const { label: sLabel, color: sColor } = window.statusMeta(c.status);
        const barColor = c.status === 'active' ? '#2D3436' : c.status === 'funded' ? '#6B9B7E' : '#E8EAED';
        const aColors = ['#658BD6','#6B9B7E','#8AB8A0','#2D3436','#658BD6','#6B9B7E'];

        return (
          <div key={c.id} onClick={() => setDetailTarget(c)} style={{ background: '#F8F9FA', borderBottom: '1px solid #E8EAED', padding: '18px 20px', cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F5F6F7'}
            onMouseLeave={e => e.currentTarget.style.background = '#F8F9FA'}>
            <div style={{ display: 'flex', gap: 12 }}>
              <Avatar name={c.creator.replace('0x','')} size={40} color={aColors[c.id % aColors.length]} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'Space Mono, monospace' }}>{c.creator}</span>
                  <span style={{ color: '#E8EAED' }}>·</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{c.daysLeft > 0 ? `${c.daysLeft}d left` : 'Ended'}</span>
                  <span style={{ marginLeft: 'auto' }}><Badge label={sLabel} color={sColor} /></span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#2D3436', marginBottom: 4, letterSpacing: '-0.2px' }}>{c.title}</div>
                <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.55, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.description}</div>
                <ProgressBar value={c.raised} max={c.goal} color={barColor} height={3} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#2D3436' }}>{c.raised.toFixed(4)} <span style={{ color: '#9CA3AF', fontWeight: 400 }}>/ {c.goal} ETH</span></span>
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>{c.contributors} supporter{c.contributors !== 1 ? 's' : ''}</span>
                  </div>
                  {c.status === 'active' && (
                    <button onClick={e => { e.stopPropagation(); setContributeTarget(c); }} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #2D3436', background: 'transparent', color: '#2D3436', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Support</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {campaigns.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF', fontSize: 13 }}>
          {window.W3?.connected
            ? (allCampaigns.length === 0 ? 'No campaigns yet — launch the first one!' : 'No campaigns match the current filter/search.')
            : 'Connect MetaMask to load on-chain campaigns.'}
        </div>
      )}

      {detailTarget && <CampaignDetailModal campaign={detailTarget} onClose={() => setDetailTarget(null)} onContribute={c => { setDetailTarget(null); setContributeTarget(c); }} />}
      {contributeTarget && <ContributeModal campaign={contributeTarget} onClose={() => setContributeTarget(null)} />}
      {showCreate && <CreateCampaignModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

window.ExploreScreen = ExploreScreen;
