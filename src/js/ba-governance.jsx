// Governance / Community — minimal forum style
const { useState: useGV } = React;

function GovernanceScreen() {
  const [proposals, setProposals] = useGV(CF.proposals || []);
  const [tab, setTab] = useGV('active');

  const handleVote = (id, choice) => {
    setProposals(ps => ps.map(p => p.id === id ? {
      ...p, userVote: choice,
      votesYes: choice === 'yes' ? p.votesYes + 100 : p.votesYes,
      votesNo: choice === 'no' ? p.votesNo + 100 : p.votesNo,
    } : p));
  };

  const filtered = proposals.filter(p => tab === 'active' ? p.status === 'active' : p.status !== 'active');
  // Status: open=default, passed=green (success), failed=red (failure)
  const statusColor = { active: '#9CA3AF', passed: '#6B9B7E', failed: '#E74C3C' };
  const statusLabel = { active: 'Open', passed: 'Passed', failed: 'Failed' };

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, background: 'rgba(248,249,250,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E8EAED', padding: '14px 20px', zIndex: 50 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#2D3436', marginBottom: 12 }}>Community</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['active','closed'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '5px 12px', borderRadius: 6, border: '1px solid', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500, transition: 'all 0.1s',
              background: tab === t ? '#2D3436' : 'transparent',
              color: tab === t ? '#F8F9FA' : '#6B7280',
              borderColor: tab === t ? '#2D3436' : '#E8EAED',
            }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* Voting power */}
      <div style={{ background: '#F8F9FA', borderBottom: '1px solid #E8EAED', padding: '12px 20px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>Voting power: <strong style={{ color: '#2D3436' }}>1,250 CFT</strong></span>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{proposals.filter(p => p.status === 'active').length} open</span>
      </div>

      {filtered.map(p => {
        const total = p.votesYes + p.votesNo + p.votesAbstain;
        const yesPct = (p.votesYes / total) * 100;
        const quorumPct = Math.min(100, (total / p.quorum) * 100);
        const sc = statusColor[p.status];
        const sl = statusLabel[p.status];

        return (
          <div key={p.id} style={{ background: '#F8F9FA', borderBottom: '1px solid #E8EAED', padding: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <Avatar name={p.proposer.replace('0x','')} size={36} color="#2D3436" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2D3436' }}>{p.proposer}</span>
                  <span style={{ color: '#E8EAED' }}>·</span>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>{p.deadline}</span>
                  <span style={{ marginLeft: 'auto' }}><Badge label={sl} color={sc} /></span>
                </div>
                <span style={{ fontSize: 10, color: '#9CA3AF', background: '#E8EAED', padding: '2px 6px', borderRadius: 4 }}>{p.category}</span>
              </div>
            </div>

            <div style={{ fontSize: 15, fontWeight: 700, color: '#2D3436', marginBottom: 6, lineHeight: 1.35 }}>{p.title}</div>
            <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 16 }}>{p.description.slice(0, 160)}...</div>

            {/* Vote bar */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', background: '#E8EAED', borderRadius: 4, overflow: 'hidden', height: 5, marginBottom: 7 }}>
                <div style={{ width: `${yesPct}%`, background: '#6B9B7E' }} />
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
                <span style={{ color: '#6B9B7E', fontWeight: 600 }}>Yes {p.votesYes.toLocaleString()}</span>
                <span style={{ color: '#9CA3AF' }}>No {p.votesNo.toLocaleString()}</span>
                <span style={{ color: '#9CA3AF' }}>Abstain {p.votesAbstain}</span>
                <span style={{ marginLeft: 'auto', color: quorumPct >= 100 ? '#6B9B7E' : '#F4B942', fontWeight: 600 }}>
                  {quorumPct >= 100 ? '✓ Quorum' : `Quorum ${quorumPct.toFixed(0)}%`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginTop: 12 }}>
              {p.status === 'active' && !p.userVote ? (
                <>
                  <button onClick={() => handleVote(p.id, 'yes')} style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid #6B9B7E', background: 'transparent', color: '#6B9B7E', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Yes</button>
                  <button onClick={() => handleVote(p.id, 'no')} style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid #E8EAED', background: 'transparent', color: '#6B7280', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>No</button>
                  <button onClick={() => handleVote(p.id, 'abstain')} style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid #E8EAED', background: 'transparent', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Abstain</button>
                </>
              ) : p.userVote ? (
                <span style={{ fontSize: 12, color: p.userVote === 'yes' ? '#6B9B7E' : '#9CA3AF', fontWeight: 600 }}>You voted {p.userVote} ✓</span>
              ) : (
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>Voting closed</span>
              )}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF', fontSize: 13 }}>No proposals in this tab</div>}
    </div>
  );
}

window.GovernanceScreen = GovernanceScreen;
