// Settings Screen — minimal list with Web3 registration support
const { useState: useST } = React;

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 38, height: 22, borderRadius: 99, cursor: 'pointer', transition: 'background 0.2s', background: value ? '#2D3436' : '#E8EAED', position: 'relative', flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F8F9FA', position: 'absolute', top: 3, left: value ? 19 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(45,52,54,0.15)' }} />
    </div>
  );
}

function SGroup({ title }) {
  return <div style={{ padding: '16px 20px 8px', fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.7px', background: '#E8EAED', borderBottom: '1px solid #E8EAED' }}>{title}</div>;
}

function SRow({ label, sub, children, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: last ? 'none' : '1px solid #E8EAED', background: '#F8F9FA' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#2D3436' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ marginLeft: 16, flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function SettingsScreen() {
  const [notifs, setNotifs] = useST({ campaigns: true, governance: true, refunds: true, tokens: false, marketing: false });
  const [network, setNetwork] = useST('mainnet');
  const [currency, setCurrency] = useST('USD');
  const [saved, setSaved] = useST(false);
  const [regName, setRegName] = useST('');
  const [regEmail, setRegEmail] = useST('');
  const [regStatus, setRegStatus] = useST('');

  const walletAddr = window.W3?.connected && window.W3.account
    ? window.W3.account
    : (CF.wallet||{}).address || '0x...';
  const walletShort = window.W3?.connected && window.W3.account
    ? window.W3.account.slice(0, 6) + '...' + window.W3.account.slice(-4)
    : (CF.wallet||{}).short || '0x...';

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const handleRegister = async () => {
    if (!window.W3?.connected) { setRegStatus('Connect MetaMask first'); return; }
    if (!regName.trim()) { setRegStatus('Name required'); return; }
    if (!regEmail.trim()) { setRegStatus('Email required'); return; }
    setRegStatus('Registering…');
    try {
      await W3.register(regName.trim(), regEmail.trim());
      setRegStatus('Registered successfully ✓');
    } catch (e) {
      setRegStatus(e.message?.slice(0, 80) || 'Registration failed');
    }
  };

  const sel = { padding: '6px 10px', borderRadius: 6, border: '1px solid #E8EAED', fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#2D3436', background: '#F8F9FA', outline: 'none', cursor: 'pointer' };
  const inp = { padding: '6px 10px', borderRadius: 6, border: '1px solid #E8EAED', fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#2D3436', background: '#F8F9FA', outline: 'none' };

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, background: 'rgba(248,249,250,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E8EAED', padding: '14px 20px', zIndex: 50 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#2D3436' }}>Settings</div>
      </div>

      <SGroup title="Account" />
      <SRow label="Display name" sub="Shown on your public profile"><input defaultValue="My Wallet" style={{ ...inp, width: 150 }} /></SRow>
      <SRow label="Wallet address" sub="Primary connected address">
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#9CA3AF', background: '#E8EAED', padding: '5px 9px', borderRadius: 5 }}>{walletShort}</div>
      </SRow>
      <SRow label="Email" sub="Off-chain notifications"><input defaultValue="user@example.com" style={{ ...inp, width: 180 }} /></SRow>
      <SRow label="Two-factor auth" sub="Extra account security" last><button style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #E8EAED', background: 'transparent', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: '#2D3436', cursor: 'pointer' }}>Enable</button></SRow>

      <SGroup title="On-chain Registration" />
      <div style={{ background: '#F8F9FA', padding: '16px 20px', borderBottom: '1px solid #E8EAED' }}>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 14, lineHeight: 1.6 }}>Register your profile on-chain. Required to create campaigns.</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <input value={regName} onChange={e => setRegName(e.target.value)} placeholder="Name" style={{ ...inp, flex: 1 }} />
          <input value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="Email" style={{ ...inp, flex: 1 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={handleRegister} style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: '#2D3436', color: '#F8F9FA', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Register</button>
          {regStatus && <span style={{ fontSize: 11, color: regStatus.includes('✓') ? '#6B9B7E' : regStatus.includes('…') ? '#F4B942' : '#E74C3C', fontWeight: 600 }}>{regStatus}</span>}
        </div>
      </div>

      <SGroup title="Network" />
      <SRow label="Ethereum network" sub="Mainnet or testnet">
        <div style={{ display: 'flex', gap: 5 }}>
          {[['mainnet','Mainnet'],['sepolia','Sepolia'],['goerli','Goerli']].map(([val,lbl])=>(
            <button key={val} onClick={()=>setNetwork(val)} style={{ padding:'4px 10px', borderRadius:5, border:'1px solid', cursor:'pointer', fontFamily:'DM Sans, sans-serif', fontSize:11, fontWeight:500, background: network===val?'#2D3436':'transparent', color: network===val?'#F8F9FA':'#6B7280', borderColor: network===val?'#2D3436':'#E8EAED' }}>{lbl}</button>
          ))}
        </div>
      </SRow>
      <SRow label="Currency"><select value={currency} onChange={e=>setCurrency(e.target.value)} style={sel}>{['USD','EUR','GBP','JPY','AUD'].map(c=><option key={c}>{c}</option>)}</select></SRow>
      <SRow label="Gas strategy" last><select style={sel}><option>Standard</option><option>Fast</option><option>Instant</option></select></SRow>

      <SGroup title="Notifications" />
      {[
        {key:'campaigns', label:'Campaign updates', sub:'Funded, failed, milestones'},
        {key:'governance', label:'Governance alerts', sub:'New proposals and deadlines'},
        {key:'refunds', label:'Refund alerts', sub:'ETH returned on failed campaigns'},
        {key:'tokens', label:'Token rewards', sub:'ERC-20 distribution events'},
        {key:'marketing', label:'Platform news', sub:'Product announcements'},
      ].map((item, i, arr) => (
        <SRow key={item.key} label={item.label} sub={item.sub} last={i===arr.length-1}>
          <Toggle value={notifs[item.key]} onChange={v=>setNotifs(n=>({...n,[item.key]:v}))} />
        </SRow>
      ))}

      <SGroup title="Account actions" />
      <SRow label="Disconnect wallet" sub="Remove wallet connection"><button style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #E8EAED', background:'transparent', fontFamily:'DM Sans,sans-serif', fontSize:12, fontWeight:600, color:'#6B7280', cursor:'pointer' }}>Disconnect</button></SRow>
      <SRow label="Export data" sub="Download transaction history"><button style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #E8EAED', background:'transparent', fontFamily:'DM Sans,sans-serif', fontSize:12, fontWeight:600, color:'#6B7280', cursor:'pointer' }}>Export</button></SRow>
      <SRow label="Delete account" sub="Permanently remove your profile" last><button style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #E74C3C', background:'transparent', fontFamily:'DM Sans,sans-serif', fontSize:12, fontWeight:600, color:'#E74C3C', cursor:'pointer' }}>Delete</button></SRow>

      <div style={{ padding:'18px 20px', background:'#F8F9FA', borderTop:'1px solid #E8EAED' }}>
        <button onClick={save} style={{ padding:'9px 22px', borderRadius:6, border:'none', background: saved?'#6B9B7E':'#2D3436', color:'#F8F9FA', fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer', transition:'background 0.2s' }}>{saved?'✓ Saved':'Save changes'}</button>
      </div>
    </div>
  );
}

window.SettingsScreen = SettingsScreen;
