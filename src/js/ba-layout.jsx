// Layout — left nav + right sidebar. All balance/wallet data comes from
// CF.wallet (populated by web3-bridge.js after MetaMask connects).
const { useState: useLY } = React;

const NAV = [
  { id: 'feed',          label: 'Home'            },
  { id: 'explore',       label: 'Explore'         },
  { id: 'mine',          label: 'My Campaigns'    },
  { id: 'contributed',   label: 'My Contributions'},
  { id: 'activity',      label: 'Activity'        },
  { id: 'send',          label: 'Send / Receive'  },
  { id: 'analytics',     label: 'Analytics'       },
  { id: 'settings',      label: 'Settings'        },
];

const ETH_USD = 3700; // same caveat as ba-wallet.jsx — no on-chain oracle

function LeftNav({ screen, onNav, onCompose, w3Connected, onConnect, w3Connecting }) {
  const w = CF.wallet;
  return (
    <aside style={{
      width: 220, position: 'fixed', top: 0, left: 0, bottom: 0,
      background: '#F8F9FA', borderRight: '1px solid #E8EAED',
      display: 'flex', flexDirection: 'column', zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid #E8EAED' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#2D3436', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono, monospace', fontWeight: 700, color: '#F8F9FA', fontSize: 11, flexShrink: 0 }}>CF</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#2D3436', letterSpacing: '-0.2px' }}>ChainFund</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
        {NAV.map(item => {
          const isActive = screen === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)} style={{
              display: 'flex', alignItems: 'center', width: '100%',
              padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: isActive ? '#E8EAED' : 'transparent',
              color: isActive ? '#2D3436' : '#6B7280',
              fontFamily: 'DM Sans, sans-serif', fontWeight: isActive ? 600 : 400,
              fontSize: 14, textAlign: 'left', transition: 'all 0.1s', marginBottom: 1,
            }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(45,52,54,0.04)'; e.currentTarget.style.color = '#2D3436'; }}}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7280'; }}}
            >
              {item.label}
            </button>
          );
        })}

        {/* Launch CTA */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #E8EAED' }}>
          <button onClick={onCompose} style={{
            width: '100%', padding: '9px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: '#2D3436', color: '#F8F9FA', fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600, fontSize: 13, transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >Launch Campaign</button>
        </div>
      </nav>

      {/* MetaMask status */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #E8EAED' }}>
        {w3Connected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6B9B7E', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#6B9B7E', fontWeight: 600, fontFamily: 'Space Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {window.W3?.account ? window.W3.account.slice(0, 6) + '...' + window.W3.account.slice(-4) : 'Connected'}
            </span>
          </div>
        ) : window.ethereum ? (
          <button onClick={onConnect} disabled={w3Connecting} style={{
            width: '100%', padding: '7px', borderRadius: 6, border: '1px solid #658BD6',
            background: 'transparent', color: '#658BD6', fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600, fontSize: 12, cursor: w3Connecting ? 'default' : 'pointer',
            opacity: w3Connecting ? 0.6 : 1,
          }}>{w3Connecting ? 'Connecting…' : 'Connect MetaMask'}</button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#9CA3AF', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>MetaMask not detected</span>
          </div>
        )}
      </div>

      {/* Connected wallet summary */}
      {w && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid #E8EAED' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Wallet</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: w.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#6B7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#2D3436' }}>{w.ethBalance.toFixed(2)}Ξ</span>
          </div>
        </div>
      )}
    </aside>
  );
}

function RightSidebar({ onNav }) {
  const w = CF.wallet;
  const totalEth = w?.ethBalance || 0;
  const campaigns = CF.campaigns || [];
  const active = campaigns.filter(c => c.status === 'active');
  const myCreated = campaigns.filter(c => c.creatorFull?.toLowerCase() === (w?.address || '').toLowerCase());

  return (
    <aside style={{ width: 260, flexShrink: 0 }}>
      {/* Search */}
      <div style={{ position: 'sticky', top: 0, background: '#E8EAED', paddingTop: 16, paddingBottom: 12, zIndex: 10 }}>
        <input placeholder="Search..." style={{
          width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #E8EAED',
          fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#2D3436',
          background: '#F8F9FA', outline: 'none', boxSizing: 'border-box',
        }} />
      </div>

      {/* Wallet summary */}
      <div style={{ background: '#F8F9FA', borderRadius: 8, padding: '16px', marginBottom: 12, border: '1px solid #E8EAED' }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Balance</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#2D3436', letterSpacing: '-0.8px', marginBottom: 1 }}>{totalEth.toFixed(4)}<span style={{ fontSize: 13, fontWeight: 500, color: '#9CA3AF', marginLeft: 4 }}>ETH</span></div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>≈ ${(totalEth * ETH_USD).toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style={{ fontSize: 10 }}>est.</span></div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Send', 'Receive'].map(lbl => (
            <button key={lbl} onClick={() => onNav('send')} style={{ flex: 1, padding: '7px', borderRadius: 6, border: '1px solid #E8EAED', background: 'transparent', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: '#2D3436', cursor: 'pointer' }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* Trending */}
      <div style={{ background: '#F8F9FA', borderRadius: 8, padding: '16px', marginBottom: 12, border: '1px solid #E8EAED' }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Trending</div>
        {active.slice(0, 3).map((c, i) => {
          const pct = Math.round((c.raised / c.goal) * 100);
          return (
            <div key={c.id} style={{ marginBottom: i < 2 ? 14 : 0, cursor: 'pointer' }} onClick={() => onNav('explore')}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2D3436', marginBottom: 5, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
              <div style={{ background: '#E8EAED', borderRadius: 99, height: 3, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: '#2D3436', borderRadius: 99 }} />
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{c.raised.toFixed(3)}/{c.goal} ETH · {c.daysLeft}d left</div>
            </div>
          );
        })}
        {active.length === 0 && <div style={{ fontSize: 12, color: '#9CA3AF' }}>No active campaigns</div>}
        <button onClick={() => onNav('explore')} style={{ marginTop: 12, background: 'none', border: 'none', color: '#2D3436', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>View all →</button>
      </div>

      {/* My participation */}
      <div style={{ background: '#F8F9FA', borderRadius: 8, padding: '16px', border: '1px solid #E8EAED' }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>My activity</div>
        {[
          ['Created', myCreated.length, 'mine'],
          ['Contributed', (CF.transactions || []).filter(t => t.type === 'Contribution').length, 'contributed'],
          ['Total campaigns', campaigns.length, 'explore'],
        ].map(([k, v, nav]) => (
          <div key={k} onClick={() => onNav(nav)} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 11, cursor: 'pointer' }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>{k}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2D3436' }}>{v}</span>
          </div>
        ))}
        <button onClick={() => onNav('mine')} style={{ marginTop: 4, background: 'none', border: 'none', color: '#2D3436', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Manage campaigns →</button>
      </div>
    </aside>
  );
}

function Shell({ children, screen, onNav, onCompose, w3Connected, onConnect, w3Connecting }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#E8EAED' }}>
      <LeftNav screen={screen} onNav={onNav} onCompose={onCompose} w3Connected={w3Connected} onConnect={onConnect} w3Connecting={w3Connecting} />
      <div style={{ marginLeft: 220, flex: 1, display: 'flex', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ width: '100%', maxWidth: 580 }}>
          {children}
        </div>
        <div style={{ width: 24 }} />
        <RightSidebar onNav={onNav} />
      </div>
    </div>
  );
}

/* ── Shared primitives ── */
function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{ background: '#F8F9FA', borderBottom: '1px solid #E8EAED', ...style }}>
      {children}
    </div>
  );
}

function Badge({ label, color }) {
  const c = color || '#9CA3AF';
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 4,
      background: c + '14', color: c,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.1px',
      fontFamily: 'Space Mono, monospace',
    }}>{label}</span>
  );
}

function ProgressBar({ value, max, color = '#2D3436', height = 3 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ background: '#E8EAED', borderRadius: 99, height, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function Btn({ children, variant = 'primary', onClick, style = {}, small = false, disabled = false }) {
  const variants = {
    primary: { background: '#2D3436', color: '#F8F9FA', border: '1px solid #2D3436' },
    ghost:   { background: 'transparent', color: '#2D3436', border: '1px solid #E8EAED' },
    danger:  { background: 'transparent', color: '#E74C3C', border: '1px solid #E74C3C' },
    success: { background: 'transparent', color: '#6B9B7E', border: '1px solid #6B9B7E' },
    blue:    { background: 'transparent', color: '#658BD6', border: '1px solid #658BD6' },
  };
  const [hov, setHov] = useLY(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        ...variants[variant], borderRadius: 6, fontFamily: 'DM Sans, sans-serif',
        fontWeight: 600, fontSize: small ? 12 : 13, cursor: disabled ? 'default' : 'pointer',
        padding: small ? '5px 12px' : '8px 16px', transition: 'opacity 0.12s',
        opacity: disabled ? 0.5 : (hov ? 0.75 : 1), ...style,
      }}>{children}</button>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: '#F8F9FA', border: '1px solid #E8EAED', borderRadius: 8, padding: '16px', flex: 1 }}>
      <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ color: '#2D3436', fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Avatar({ name, size = 38, color = '#2D3436' }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F8F9FA', fontWeight: 700, fontSize: size * 0.34, flexShrink: 0 }}>
      {(name || 'U').slice(0, 2).toUpperCase()}
    </div>
  );
}

Object.assign(window, { Shell, Card, Badge, ProgressBar, Btn, StatCard, Avatar });
