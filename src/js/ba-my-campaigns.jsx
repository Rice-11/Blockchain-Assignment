// My Campaigns — creator dashboard. Lists every campaign where the connected
// account is the creator. Each card exposes the on-chain creator actions:
//   • Withdraw — RefundContract.withdraw(), available once goal is met.
//   • Distribute rewards — RewardsAndHistory.distributeRewards(), available
//     after the deadline if the goal was met.
// Contributor addresses below each card are fetched live via W3.getContributors,
// which reads RewardsAndHistory.getContributors() for that campaign's instance.
const { useState: useMC, useEffect: useMCFX } = React;

function ContributorsBlock({ campaignId }) {
  const [rows, setRows] = useMC(null);
  const [loading, setLoading] = useMC(true);

  useMCFX(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = window.W3?.connected ? await W3.getContributors(campaignId) : [];
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [campaignId]);

  if (loading) return <div style={{ fontSize: 12, color: '#9CA3AF', padding: '8px 0' }}>Loading contributors…</div>;
  if (!rows || rows.length === 0) return <div style={{ fontSize: 12, color: '#9CA3AF', padding: '8px 0' }}>No contributors yet.</div>;

  return (
    <div style={{ border: '1px solid #E8EAED', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '8px 14px', background: '#E8EAED', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {rows.length} contributor{rows.length !== 1 ? 's' : ''} · wallet addresses only
      </div>
      {rows.map((r, i) => (
        <div key={r.address} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: i % 2 === 0 ? '#F8F9FA' : '#FAFAFA', borderTop: i > 0 ? '1px solid #E8EAED' : 'none' }}>
          <span style={{ fontSize: 12, fontFamily: 'Space Mono, monospace', color: '#2D3436' }}>{r.short}</span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#2D3436' }}>{r.eth.toFixed(4)} ETH</span>
            {r.claimed && (
              <span style={{ fontSize: 11, color: '#F4B942', fontWeight: 600 }}>{r.tokens.toFixed(0)} {window.TOKEN_SYMBOL || 'CFT'}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MyCampaignCard({ campaign: c }) {
  const [actionErr, setActionErr] = useMC('');
  const [actionBusy, setActionBusy] = useMC(null); // 'withdraw' | 'distribute' | null
  const [expanded, setExpanded] = useMC(false);

  const pct = Math.min(100, Math.round((c.raised / c.goal) * 100));
  const { label: sLabel, color: sColor } = window.statusMeta(c.status);
  const now = Math.floor(Date.now() / 1000);
  const deadlinePassed = now >= c.deadlineTs;
  const canWithdraw = c.status === 'funded';
  const canDistribute = c.status === 'funded' && deadlinePassed;

  const run = async (which, fn) => {
    setActionErr('');
    setActionBusy(which);
    try { await fn(); } catch (e) { setActionErr(e.message?.slice(0, 140) || 'Action failed'); }
    finally { setActionBusy(null); }
  };

  return (
    <div style={{ background: '#F8F9FA', borderBottom: '1px solid #E8EAED', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Badge label={sLabel} color={sColor} />
            <Badge label={`#${c.id}`} color="#9CA3AF" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#2D3436', letterSpacing: '-0.2px', marginBottom: 3 }}>{c.title}</div>
          <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.description}</div>
        </div>
      </div>

      <div style={{ background: '#E8EAED', borderRadius: 8, padding: '12px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#2D3436', letterSpacing: '-0.3px' }}>{c.raised.toFixed(4)} <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF' }}>/ {c.goal} ETH</span></span>
          <span style={{ fontSize: 13, fontWeight: 700, color: sColor }}>{pct}%</span>
        </div>
        <ProgressBar value={c.raised} max={c.goal} color={c.status === 'active' ? '#2D3436' : c.status === 'funded' ? '#6B9B7E' : '#E8EAED'} height={3} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{c.contributors} supporter{c.contributors !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{c.daysLeft > 0 ? `${c.daysLeft}d left` : `Ended ${c.deadline}`}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <Btn
          variant={canWithdraw ? 'success' : 'ghost'}
          disabled={!canWithdraw || actionBusy !== null}
          onClick={() => run('withdraw', () => W3.withdraw(c.id))}
          small
        >{actionBusy === 'withdraw' ? 'Withdrawing…' : 'Withdraw'}</Btn>
        <Btn
          variant={canDistribute ? 'blue' : 'ghost'}
          disabled={!canDistribute || actionBusy !== null}
          onClick={() => run('distribute', () => W3.distributeRewards(c.id))}
          small
        >{actionBusy === 'distribute' ? 'Distributing…' : 'Distribute rewards'}</Btn>
        <Btn variant="ghost" onClick={() => setExpanded(v => !v)} small>{expanded ? 'Hide contributors' : 'Show contributors'}</Btn>
      </div>

      {!canWithdraw && c.status === 'active' && (
        <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 }}>Withdraw unlocks once the goal is met.</div>
      )}
      {!canDistribute && c.status === 'funded' && !deadlinePassed && (
        <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 }}>Rewards can be distributed after the deadline ({c.deadline}).</div>
      )}
      {c.status === 'failed' && (
        <div style={{ fontSize: 11, color: '#E74C3C', lineHeight: 1.5 }}>Goal not met — contributors can refund from the RefundContract directly.</div>
      )}
      {actionErr && <div style={{ fontSize: 11, color: '#E74C3C', lineHeight: 1.5, marginTop: 8 }}>{actionErr}</div>}

      {expanded && (
        <div style={{ marginTop: 14 }}>
          <ContributorsBlock campaignId={c.id} />
        </div>
      )}
    </div>
  );
}

function MyCampaignsScreen() {
  const acct = (window.W3?.account || '').toLowerCase();
  const mine = (CF.campaigns || []).filter(c => c.creatorFull?.toLowerCase() === acct);
  const funded = mine.filter(c => c.status === 'funded').length;
  const active = mine.filter(c => c.status === 'active').length;
  const failed = mine.filter(c => c.status === 'failed').length;
  const totalRaised = mine.reduce((s, c) => s + c.raised, 0);

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, background: 'rgba(248,249,250,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E8EAED', padding: '14px 20px', zIndex: 50 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#2D3436' }}>My Campaigns</div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Campaigns you created as <span style={{ fontFamily: 'Space Mono, monospace' }}>{acct ? acct.slice(0, 6) + '...' + acct.slice(-4) : '—'}</span></div>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', background: '#F8F9FA', borderBottom: '1px solid #E8EAED' }}>
        {[
          ['Total', mine.length, '#2D3436'],
          ['Active', active, '#F4B942'],
          ['Funded', funded, '#6B9B7E'],
          ['Failed', failed, '#E74C3C'],
        ].map(([k, v, color], i, arr) => (
          <div key={k} style={{ flex: 1, padding: '14px 16px', borderRight: i < arr.length - 1 ? '1px solid #E8EAED' : 'none' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{v}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{k}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #E8EAED', background: '#F8F9FA', fontSize: 12, color: '#6B7280' }}>
        Total raised across your campaigns: <strong style={{ color: '#2D3436' }}>{totalRaised.toFixed(4)} ETH</strong>
      </div>

      {mine.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF', fontSize: 13 }}>
          {window.W3?.connected
            ? 'You haven\'t created any campaigns yet. Click "Launch Campaign" in the sidebar.'
            : 'Connect MetaMask to see campaigns you created.'}
        </div>
      ) : (
        mine.map(c => <MyCampaignCard key={c.id} campaign={c} />)
      )}
    </div>
  );
}

window.MyCampaignsScreen = MyCampaignsScreen;
