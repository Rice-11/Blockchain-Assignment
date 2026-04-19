// Wallet + Send/Receive — backed by the connected MetaMask account only.
// No hardcoded multi-wallet mock list: before connect, show a prompt to connect.
const { useState: useWS } = React;

// Local USD rate guess; the contracts have no price oracle. Displayed as
// "≈ $X" with a caveat — swap in a real oracle (e.g., Chainlink) if needed.
const ETH_USD = 3700;

function WalletScreen({ onNav }) {
  const [tab, setTab] = useWS('overview');
  const w = CF.wallet || (CF.wallets || [])[0];
  const totalEth = w?.ethBalance || 0;

  if (!w) {
    return (
      <div>
        <div style={{ position: 'sticky', top: 0, background: 'rgba(248,249,250,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E8EAED', padding: '14px 20px', zIndex: 50 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#2D3436', letterSpacing: '-0.3px' }}>Wallet</div>
        </div>
        <div style={{ background: '#F8F9FA', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#2D3436', marginBottom: 8 }}>No wallet connected</div>
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>Click "Connect MetaMask" in the sidebar to load your wallet.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, background: 'rgba(248,249,250,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E8EAED', padding: '14px 20px', zIndex: 50 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#2D3436', letterSpacing: '-0.3px' }}>Wallet</div>
      </div>

      <div style={{ background: '#F8F9FA', borderBottom: '1px solid #E8EAED', padding: '24px 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(45,52,54,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Balance</div>
        <div style={{ fontSize: 36, fontWeight: 800, color: '#2D3436', letterSpacing: '-1.5px', marginBottom: 3 }}>
          {totalEth.toFixed(4)} <span style={{ fontSize: 18, fontWeight: 500, color: 'rgba(45,52,54,0.35)', letterSpacing: 0 }}>ETH</span>
        </div>
        <div style={{ fontSize: 14, color: 'rgba(45,52,54,0.4)', marginBottom: 20 }}>≈ ${(totalEth * ETH_USD).toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style={{ fontSize: 11 }}>(est.)</span></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: w.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F8F9FA', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{w.label.slice(0, 1)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#2D3436' }}>{w.label}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'Space Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.address}</div>
          </div>
          <button onClick={() => { navigator.clipboard?.writeText(w.address).catch(() => {}); }} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #E8EAED', background: 'transparent', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: '#658BD6', cursor: 'pointer', flexShrink: 0 }}>Copy</button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => onNav('send')} style={{ padding: '9px 22px', borderRadius: 99, border: 'none', background: '#2D3436', color: '#F8F9FA', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Send ETH</button>
          <button onClick={() => onNav('send')} style={{ padding: '9px 22px', borderRadius: 99, border: '1px solid #E8EAED', background: 'transparent', color: '#2D3436', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Receive</button>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #E8EAED', background: '#F8F9FA' }}>
        {[['overview', 'Overview'], ['activity', 'Activity']].map(([t, lbl]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '14px', border: 'none', cursor: 'pointer', background: 'transparent',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 14,
            color: tab === t ? '#2D3436' : 'rgba(45,52,54,0.4)',
            borderBottom: `2px solid ${tab === t ? '#658BD6' : 'transparent'}`, transition: 'all 0.15s',
          }}>{lbl}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          {(() => {
            const campaigns = CF.campaigns || [];
            const mine = campaigns.filter(c => c.creatorFull?.toLowerCase() === w.address.toLowerCase());
            const contributedIds = new Set((CF.transactions || []).filter(t => t.type === 'Contribution').map(t => t.campaignId));
            const contributed = campaigns.filter(c => contributedIds.has(c.id));
            const rows = [
              ['Campaigns created', mine.length, () => onNav('mine')],
              ['Campaigns backed', contributed.length, () => onNav('contributed')],
              ['On-chain transactions', (CF.transactions || []).length, () => onNav('activity')],
            ];
            return rows.map(([k, v, fn], i) => (
              <div key={k} onClick={fn} style={{ padding: '14px 20px', borderBottom: '1px solid #E8EAED', background: '#F8F9FA', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: 13, color: '#6B7280' }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#2D3436' }}>{v} ›</span>
              </div>
            ));
          })()}
        </div>
      )}

      {tab === 'activity' && (
        <div>
          {(CF.transactions || []).slice(0, 6).map(tx => {
            const isIn = tx.direction === 'in';
            return (
              <div key={tx.id} style={{ padding: '16px 20px', borderBottom: '1px solid #E8EAED', background: '#F8F9FA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#2D3436', marginBottom: 3 }}>{tx.type}</div>
                  <div style={{ fontSize: 12, color: 'rgba(45,52,54,0.4)' }}>{tx.campaign || 'External'} · {tx.date}</div>
                </div>
                {tx.amount > 0 && (
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#2D3436', fontFamily: 'Space Mono, monospace', letterSpacing: '-0.3px' }}>
                    {isIn ? '+' : '−'}{tx.amount.toFixed(4)} ETH
                  </div>
                )}
              </div>
            );
          })}
          {(CF.transactions || []).length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF', fontSize: 13 }}>No on-chain activity yet.</div>
          )}
          {(CF.transactions || []).length > 0 && (
            <div onClick={() => onNav('activity')} style={{ padding: '16px 20px', textAlign: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#658BD6', borderBottom: '1px solid #E8EAED', background: '#F8F9FA' }}>View all activity →</div>
          )}
        </div>
      )}
    </div>
  );
}

function SendReceiveScreen() {
  const [tab, setTab] = useWS('send');
  const [addr, setAddr] = useWS('');
  const [amount, setAmount] = useWS('');
  const [step, setStep] = useWS('form');
  const [copied, setCopied] = useWS(false);
  const [sending, setSending] = useWS(false);
  const [sendError, setSendError] = useWS('');

  const w = CF.wallet || (CF.wallets || [])[0];

  if (!w) {
    return (
      <div>
        <div style={{ position: 'sticky', top: 0, background: 'rgba(248,249,250,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E8EAED', padding: '14px 20px', zIndex: 50 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#2D3436', letterSpacing: '-0.3px' }}>Send / Receive</div>
        </div>
        <div style={{ background: '#F8F9FA', padding: '60px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Connect MetaMask to send or receive ETH.</div>
      </div>
    );
  }

  const handleSend = async () => {
    if (step === 'form') { setStep('confirm'); return; }
    setSendError('');
    if (!window.W3?.connected) { setSendError('Wallet not connected'); return; }
    setSending(true);
    try {
      await W3.sendEth(addr, parseFloat(amount));
      setStep('done');
    } catch (e) {
      setSendError(e.message?.slice(0, 120) || 'Transaction failed');
    } finally {
      setSending(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(w.address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, background: 'rgba(248,249,250,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E8EAED', padding: '14px 20px', zIndex: 50 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#2D3436', letterSpacing: '-0.3px' }}>Send / Receive</div>
      </div>

      <div style={{ display: 'flex', background: '#F8F9FA', borderBottom: '1px solid #E8EAED' }}>
        {['send', 'receive'].map(t => (
          <button key={t} onClick={() => { setTab(t); setStep('form'); setSendError(''); }} style={{
            flex: 1, padding: '14px', border: 'none', cursor: 'pointer', background: 'transparent',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 14,
            color: tab === t ? '#2D3436' : 'rgba(45,52,54,0.4)',
            borderBottom: `2px solid ${tab === t ? '#658BD6' : 'transparent'}`, transition: 'all 0.15s',
          }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      <div style={{ background: '#F8F9FA', padding: '24px 20px' }}>
        {tab === 'send' && (
          step === 'done' ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid #6B9B7E', background: '#6B9B7E12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#6B9B7E', margin: '0 auto 16px' }}>✓</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#2D3436', marginBottom: 6 }}>Transaction sent</div>
              <div style={{ color: 'rgba(45,52,54,0.5)', fontSize: 14, marginBottom: 4 }}>{amount} ETH</div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'rgba(45,52,54,0.35)', marginBottom: 28 }}>from {w.short} → {addr.slice(0, 14)}…</div>
              <button onClick={() => { setStep('form'); setAddr(''); setAmount(''); setSendError(''); }} style={{ padding: '9px 24px', borderRadius: 99, border: '1px solid #E8EAED', background: 'transparent', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, color: '#2D3436', cursor: 'pointer' }}>Send again</button>
            </div>
          ) : step === 'confirm' ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#2D3436', marginBottom: 20 }}>Review transaction</div>
              <div style={{ background: '#E8EAED', borderRadius: 14, padding: 18, marginBottom: 20 }}>
                {[
                  ['From', w.short],
                  ['To', addr.slice(0, 18) + (addr.length > 18 ? '…' : '')],
                  ['Amount', `${amount} ETH`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: k !== 'Amount' ? '1px solid rgba(45,52,54,0.07)' : 'none' }}>
                    <span style={{ fontSize: 13, color: 'rgba(45,52,54,0.5)' }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#2D3436', fontFamily: k === 'From' ? 'DM Sans, sans-serif' : 'Space Mono, monospace' }}>{v}</span>
                  </div>
                ))}
              </div>
              {sendError && <div style={{ fontSize: 12, color: '#E74C3C', marginBottom: 14, lineHeight: 1.5 }}>{sendError}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setStep('form'); setSendError(''); }} style={{ flex: 1, padding: '11px', borderRadius: 99, border: '1px solid #E8EAED', background: 'transparent', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, color: 'rgba(45,52,54,0.6)', cursor: 'pointer' }}>Back</button>
                <button onClick={handleSend} disabled={sending} style={{ flex: 1, padding: '11px', borderRadius: 99, border: 'none', background: '#2D3436', color: '#F8F9FA', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 700, cursor: sending ? 'default' : 'pointer', opacity: sending ? 0.6 : 1 }}>{sending ? 'Signing…' : 'Confirm & Sign'}</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(45,52,54,0.5)', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>From</label>
                <div style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #E8EAED', background: '#F8F9FA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: w.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F8F9FA', fontWeight: 700, fontSize: 12 }}>{w.label.slice(0, 1)}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#2D3436' }}>{w.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(45,52,54,0.4)', fontFamily: 'Space Mono, monospace' }}>{w.short}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#2D3436' }}>{w.ethBalance} ETH</div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(45,52,54,0.5)', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>To address</label>
                <input value={addr} onChange={e => setAddr(e.target.value)} placeholder="0x..." style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #E8EAED', fontFamily: 'Space Mono, monospace', fontSize: 13, color: '#2D3436', background: '#F8F9FA', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(45,52,54,0.5)', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount (ETH)</label>
                <div style={{ position: 'relative' }}>
                  <input value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.001" placeholder="0.000" style={{ width: '100%', padding: '14px 64px 14px 16px', borderRadius: 10, border: '1px solid #E8EAED', fontFamily: 'Space Mono, monospace', fontSize: 22, fontWeight: 700, color: '#2D3436', background: '#F8F9FA', boxSizing: 'border-box', outline: 'none' }} />
                  <button onClick={() => setAmount(String(w.ethBalance))} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: '#E8EAED', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: '#2D3436', fontWeight: 700 }}>MAX</button>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(45,52,54,0.4)', marginTop: 6 }}>Available: {w.ethBalance} ETH</div>
              </div>
              <button onClick={handleSend} disabled={!(parseFloat(amount) > 0 && addr.startsWith('0x'))} style={{ width: '100%', padding: '13px', borderRadius: 99, border: 'none', background: '#2D3436', color: '#F8F9FA', fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: (parseFloat(amount) > 0 && addr.startsWith('0x')) ? 1 : 0.5 }}>Review Transaction</button>
            </>
          )
        )}
        {tab === 'receive' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 160, height: 160, margin: '0 auto 16px', background: '#E8EAED', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'rgba(45,52,54,0.3)', textAlign: 'center', lineHeight: 2 }}>[ QR placeholder ]</div>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(45,52,54,0.4)' }}>Share your address to receive ETH.</div>
            </div>
            <div style={{ background: '#E8EAED', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#2D3436', flex: 1, wordBreak: 'break-all' }}>{w.address}</span>
              <button onClick={handleCopy} style={{ background: copied ? '#6B9B7E' : '#2D3436', border: 'none', borderRadius: 8, padding: '7px 14px', color: '#F8F9FA', fontSize: 12, cursor: 'pointer', fontWeight: 600, flexShrink: 0, transition: 'background 0.2s' }}>{copied ? '✓ Copied' : 'Copy'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

window.WalletScreen = WalletScreen;
window.SendReceiveScreen = SendReceiveScreen;
