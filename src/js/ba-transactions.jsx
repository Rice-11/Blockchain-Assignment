// Activity — derived from CF.transactions, which web3-bridge.js populates
// from RewardsAndHistory.getTransactionHistory() across every campaign the
// connected account has touched. No hardcoded rows.
const { useState: useTX } = React;

function TransactionsScreen() {
  const [filter, setTxFilter] = useTX('all');
  const filters = ['all', 'Contribution', 'Token Reward'];
  const txs = (CF.transactions || []).filter(t => filter === 'all' || t.type === filter);

  const totalOut = txs.filter(t => t.direction === 'out').reduce((s, t) => s + t.amount, 0);
  const totalIn = txs.filter(t => t.direction === 'in').reduce((s, t) => s + t.amount, 0);
  const claimedTokens = txs.filter(t => t.type === 'Token Reward').length;

  const statusColor = { pending: '#F4B942', confirmed: '#6B9B7E', failed: '#E74C3C' };
  const typeIcon = { Contribution: '◈', 'Token Reward': '◎' };

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, background: 'rgba(248,249,250,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E8EAED', padding: '14px 20px', zIndex: 50 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#2D3436', marginBottom: 12 }}>Activity</div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {filters.map(f => (
            <button key={f} onClick={() => setTxFilter(f)} style={{
              padding: '4px 11px', borderRadius: 6, border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, transition: 'all 0.1s',
              background: filter === f ? '#2D3436' : 'transparent',
              color: filter === f ? '#F8F9FA' : '#6B7280',
              borderColor: filter === f ? '#2D3436' : '#E8EAED',
            }}>{f === 'all' ? 'All' : f}</button>
          ))}
        </div>
      </div>

      {/* Summary — computed from on-chain history */}
      <div style={{ display: 'flex', background: '#F8F9FA', borderBottom: '1px solid #E8EAED' }}>
        <div style={{ flex: 1, padding: '14px 18px', borderRight: '1px solid #E8EAED' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#2D3436', letterSpacing: '-0.5px' }}>{totalOut.toFixed(4)} ETH</div>
          <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Contributed</div>
        </div>
        <div style={{ flex: 1, padding: '14px 18px', borderRight: '1px solid #E8EAED' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#6B9B7E', letterSpacing: '-0.5px' }}>{claimedTokens}</div>
          <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Rewards issued</div>
        </div>
        <div style={{ flex: 1, padding: '14px 18px' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#2D3436', letterSpacing: '-0.5px' }}>{(CF.campaigns || []).length}</div>
          <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Campaigns seen</div>
        </div>
      </div>

      {txs.map((tx) => {
        const isIn = tx.direction === 'in';
        const sc = statusColor[tx.status] || '#9CA3AF';
        return (
          <div key={tx.id} style={{ background: '#F8F9FA', borderBottom: '1px solid #E8EAED', padding: '15px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E8EAED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#6B7280', flexShrink: 0 }}>
              {typeIcon[tx.type] || '·'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#2D3436' }}>{tx.type}</span>
                {tx.amount > 0 && (
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#2D3436', fontFamily: 'Space Mono, monospace' }}>
                    {isIn ? '+' : '−'}{tx.amount.toFixed(4)} ETH
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 5 }}>{tx.campaign || 'External'} · {tx.date}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge label={tx.status} color={sc} />
                {tx.token && <span style={{ fontSize: 11, color: '#F4B942', fontWeight: 600 }}>{tx.token}</span>}
              </div>
              <div style={{ fontSize: 10, color: '#658BD6', marginTop: 5, fontFamily: 'Space Mono, monospace' }}>{tx.hash}</div>
            </div>
          </div>
        );
      })}

      {txs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF', fontSize: 13 }}>
          {window.W3?.connected ? 'No on-chain activity yet. Contribute to a campaign to see history here.' : 'Connect MetaMask to load activity.'}
        </div>
      )}
    </div>
  );
}

window.TransactionsScreen = TransactionsScreen;
