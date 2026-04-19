// App root — routes between on-chain screens. MetaMask connect happens via
// W3 (web3-bridge.js); every listener added via W3.onUpdate triggers a
// re-render when any piece of chain state refreshes (campaigns, tx history,
// balance, registration status, etc.), so screens can stay dumb.
const { useState: useApp, useEffect: useAppFX } = React;

function App() {
  const [screen, setScreen] = useApp(() => localStorage.getItem('cf_screen') || 'feed');
  const [tweaks, setTweaks] = useApp(false);
  const [showCompose, setShowCompose] = useApp(false);
  const [w3Connected, setW3Connected] = useApp(false);
  const [w3Connecting, setW3Connecting] = useApp(false);
  const [w3Error, setW3Error] = useApp('');
  const [bannerDismissed, setBannerDismissed] = useApp(false);
  const [, forceUpdate] = useApp(0);

  useAppFX(() => { localStorage.setItem('cf_screen', screen); }, [screen]);

  useAppFX(() => {
    if (window.W3) {
      W3.onUpdate(() => {
        setW3Connected(W3.connected);
        forceUpdate(n => n + 1);
      });
    }
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaks(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaks(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleConnect = async () => {
    setW3Connecting(true);
    setW3Error('');
    try {
      await W3.connect();
    } catch (e) {
      setW3Error(e.message);
    } finally {
      setW3Connecting(false);
    }
  };

  const handleNav = (s) => setScreen(s);

  const screens = {
    feed:         <FeedScreen onCompose={() => setShowCompose(true)} />,
    explore:      <ExploreScreen />,
    mine:         <MyCampaignsScreen />,
    contributed:  <MyContributionsScreen />,
    activity:     <TransactionsScreen />,
    send:         <SendReceiveScreen />,
    analytics:    <AnalyticsScreen />,
    settings:     <SettingsScreen />,
    wallet:       <WalletScreen onNav={handleNav} />,
  };

  return (
    <>
      <Shell
        screen={screen} onNav={handleNav} onCompose={() => setShowCompose(true)}
        w3Connected={w3Connected} onConnect={handleConnect} w3Connecting={w3Connecting}
      >
        {screens[screen] || screens.feed}
      </Shell>

      {showCompose && <CreateCampaignModal onClose={() => setShowCompose(false)} />}

      {/* MetaMask connect banner — shown when MetaMask is available but not connected */}
      {!w3Connected && !bannerDismissed && window.ethereum && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#2D3436', borderRadius: 8, padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 12, zIndex: 9998,
          boxShadow: '0 4px 20px rgba(45,52,54,0.25)',
          fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F4B942', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#F8F9FA' }}>Connect wallet to use on-chain features</span>
          {w3Error && (
            <span style={{ fontSize: 11, color: '#E74C3C', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{w3Error}</span>
          )}
          <button onClick={handleConnect} disabled={w3Connecting} style={{
            padding: '7px 16px', borderRadius: 6, border: 'none',
            cursor: w3Connecting ? 'default' : 'pointer',
            background: '#658BD6', color: '#F8F9FA',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 13,
            opacity: w3Connecting ? 0.6 : 1, transition: 'opacity 0.15s',
          }}>{w3Connecting ? 'Connecting…' : 'Connect'}</button>
          <button onClick={() => setBannerDismissed(true)} style={{
            background: 'none', border: 'none', color: 'rgba(248,249,250,0.4)', fontSize: 18, cursor: 'pointer', padding: 0,
          }}>×</button>
        </div>
      )}

      {/* Tweaks panel */}
      {tweaks && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, width: 260,
          background: '#F8F9FA', border: '1px solid #E8EAED', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(45,52,54,0.14)', zIndex: 9999,
          fontFamily: 'DM Sans, sans-serif',
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #E8EAED', fontWeight: 700, fontSize: 14, color: '#2D3436', display: 'flex', justifyContent: 'space-between' }}>
            Tweaks
            <button onClick={() => setTweaks(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'rgba(45,52,54,0.3)' }}>×</button>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(45,52,54,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Navigate to screen</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['feed','explore','mine','contributed','activity','send','analytics','wallet','settings'].map(s => (
                  <button key={s} onClick={() => handleNav(s)} style={{
                    padding: '5px 10px', borderRadius: 99, border: '1px solid',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                    background: screen === s ? '#2D3436' : 'transparent',
                    color: screen === s ? '#F8F9FA' : 'rgba(45,52,54,0.55)',
                    borderColor: screen === s ? '#2D3436' : '#E8EAED',
                  }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(45,52,54,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Color guide</div>
              {[['#658BD6','Primary / interactive'],['#F4B942','In progress / pending'],['#6B9B7E','Success / confirmed'],['#E74C3C','Errors / failures only']].map(([color, label]) => (
                <div key={color} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'rgba(45,52,54,0.6)' }}>{label}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(45,52,54,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Web3 status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: w3Connected ? '#6B9B7E' : '#9CA3AF' }} />
                <span style={{ fontSize: 11, color: '#6B7280' }}>{w3Connected ? 'Connected to MetaMask' : 'Not connected'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
