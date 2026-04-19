// My Contributions — contributor dashboard. For every campaign where the
// connected account has a non-zero contributions[] entry on the campaign's
// RewardsAndHistory, show:
//   • Amount contributed (from RewardsAndHistory.contributions(account))
//   • Reward tokens earned (from RewardsAndHistory.rewardTokens(account))
//   • Refund button — calls RefundContract.refund() on the campaign's vault
//     when the campaign is in State.Failed (deadline passed, goal not met).
// Data is loaded on mount by scanning all campaigns once and filtering to
// the ones the user has touched. No hardcoded contribution rows.
const { useState: useMT, useEffect: useMTFX } = React;

function ContributionCard({ entry, onRefundDone }) {
  const { campaign: c, contributionEth, tokens, claimed } = entry;
  const [busy, setBusy] = useMT(false);
  const [err, setErr] = useMT('');
  const { label: sLabel, color: sColor } = window.statusMeta(c.status);
  const pct = Math.min(100, Math.round((c.raised / c.goal) * 100));
  const canRefund = c.status === 'failed' && contributionEth > 0;

  const handleRefund = async () => {
    setBusy(true); setErr('');
    try {
      await W3.refund(c.id);
      onRefundDone?.();
    } catch (e) {
      setErr(e.message?.slice(0, 140) || 'Refund failed');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ background: '#F8F9FA', borderBottom: '1px solid #E8EAED', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Badge label={sLabel} color={sColor} />
        <Badge label={`#${c.id}`} color="#9CA3AF" />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#2D3436', letterSpacing: '-0.2px', marginBottom: 3 }}>{c.title}</div>
      <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'Space Mono, monospace', marginBottom: 14 }}>creator {c.creator}</div>

      <div style={{ background: '#E8EAED', borderRadius: 8, padding: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#2D3436' }}>{c.raised.toFixed(4)} <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF' }}>/ {c.goal} ETH</span></span>
          <span style={{ fontSize: 12, fontWeight: 700, color: sColor }}>{pct}%</span>
        </div>
        <ProgressBar value={c.raised} max={c.goal} color={c.status === 'active' ? '#2D3436' : c.status === 'funded' ? '#6B9B7E' : '#E8EAED'} height={3} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, background: '#E8EAED', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>You contributed</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#2D3436', letterSpacing: '-0.3px' }}>{contributionEth.toFixed(4)} <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF' }}>ETH</span></div>
        </div>
        <div style={{ flex: 1, background: '#E8EAED', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Reward tokens {claimed ? '' : '(pending)'}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: claimed ? '#F4B942' : '#9CA3AF', letterSpacing: '-0.3px' }}>{tokens.toFixed(0)} <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF' }}>{window.TOKEN_SYMBOL || 'CFT'}</span></div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {canRefund && (
          <Btn variant="danger" onClick={handleRefund} disabled={busy} small>{busy ? 'Refunding…' : 'Claim refund'}</Btn>
        )}
        {c.status === 'funded' && !claimed && (
          <span style={{ fontSize: 11, color: '#9CA3AF', padding: '5px 0' }}>Waiting for creator to distribute rewards.</span>
        )}
        {c.status === 'funded' && claimed && (
          <span style={{ fontSize: 11, color: '#6B9B7E', padding: '5px 0', fontWeight: 600 }}>✓ Reward issued</span>
        )}
        {c.status === 'active' && (
          <span style={{ fontSize: 11, color: '#F4B942', padding: '5px 0' }}>Active — {c.daysLeft} day{c.daysLeft !== 1 ? 's' : ''} left</span>
        )}
      </div>

      {err && <div style={{ fontSize: 11, color: '#E74C3C', lineHeight: 1.5, marginTop: 8 }}>{err}</div>}
    </div>
  );
}

function MyContributionsScreen() {
  const [entries, setEntries] = useMT(null); // null = loading, [] = none
  const [version, setVersion] = useMT(0); // bump to refresh

  useMTFX(() => {
    let cancelled = false;
    async function load() {
      if (!window.W3?.connected) { setEntries([]); return; }
      const out = [];
      for (const c of (CF.campaigns || [])) {
        try {
          const eth = await W3.getMyContribution(c.id);
          if (eth <= 0) continue;
          const tokens = await W3.getMyTokens(c.id);
          const rh = new W3.web3.eth.Contract(W3._abis.rh, c._rewardInstance);
          let claimed = false;
          try { claimed = await rh.methods.rewardClaimed(W3.account).call(); } catch {}
          out.push({ campaign: c, contributionEth: eth, tokens, claimed });
        } catch {}
      }
      if (!cancelled) setEntries(out);
    }
    load();
    return () => { cancelled = true; };
  }, [version, (CF.campaigns || []).length, window.W3?.account]);

  const totalContributed = entries ? entries.reduce((s, e) => s + e.contributionEth, 0) : 0;
  const totalTokens = entries ? entries.reduce((s, e) => s + e.tokens, 0) : 0;
  const refundable = entries ? entries.filter(e => e.campaign.status === 'failed').length : 0;

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, background: 'rgba(248,249,250,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E8EAED', padding: '14px 20px', zIndex: 50 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#2D3436' }}>My Contributions</div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Campaigns you've funded with ETH</div>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', background: '#F8F9FA', borderBottom: '1px solid #E8EAED' }}>
        {[
          ['Campaigns', entries ? entries.length : '—', '#2D3436'],
          ['Total ETH', entries ? totalContributed.toFixed(4) : '—', '#2D3436'],
          ['Tokens', entries ? totalTokens.toFixed(0) : '—', '#F4B942'],
          ['Refundable', entries ? refundable : '—', '#E74C3C'],
        ].map(([k, v, color], i, arr) => (
          <div key={k} style={{ flex: 1, padding: '14px 16px', borderRight: i < arr.length - 1 ? '1px solid #E8EAED' : 'none' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{v}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{k}</div>
          </div>
        ))}
      </div>

      {entries === null && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF', fontSize: 13 }}>Loading on-chain contributions…</div>
      )}
      {entries && entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF', fontSize: 13 }}>
          {window.W3?.connected
            ? 'No contributions yet. Browse campaigns in Explore and support one.'
            : 'Connect MetaMask to see your contributions.'}
        </div>
      )}
      {entries && entries.map(e => (
        <ContributionCard key={e.campaign.id} entry={e} onRefundDone={() => setVersion(v => v + 1)} />
      ))}
    </div>
  );
}

window.MyContributionsScreen = MyContributionsScreen;
