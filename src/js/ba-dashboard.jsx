// Home Feed — campaign list, contribute flow, create flow.
// Everything below reads from CF.campaigns (populated by web3-bridge.js from
// the Crowdfunding contract). No hardcoded campaign / token / milestone data.
const { useState: useFD, useEffect: useFDFX } = React;

// Contracts emit a single reward token pool per campaign; we label it CFT
// platform-wide. The actual share = (your_contribution / total_funds) * 1000,
// computed in RewardsAndHistory.distributeRewards after the deadline.
const TOKEN_SYMBOL = 'CFT';

function statusMeta(status) {
  if (status === 'active')  return { label: 'Active',  color: '#F4B942' };
  if (status === 'funded')  return { label: 'Funded',  color: '#6B9B7E' };
  if (status === 'failed')  return { label: 'Failed',  color: '#E74C3C' };
  return { label: status, color: '#9CA3AF' };
}

function estimateTokens(ethAmount, campaign) {
  // Rough pre-success estimate. Actual payout is decided by distributeRewards()
  // at deadline based on final total_funds. If the goal is met exactly and the
  // user is the only contributor, they get 1000 CFT; otherwise it's proportional
  // to their share of total_funds.
  const amt = parseFloat(ethAmount) || 0;
  if (!amt) return 0;
  const futureTotal = Math.max(campaign.raised + amt, campaign.goal);
  return Math.floor((amt / futureTotal) * 1000);
}

function ContributeModal({ campaign, onClose }) {
  const [amount, setAmount] = useFD('');
  const [step, setStep] = useFD('input');
  const [err, setErr] = useFD('');
  const tokens = estimateTokens(amount, campaign);

  const handleConfirm = async () => {
    setErr('');
    if (!window.W3?.connected) { setErr('Connect MetaMask first'); return; }
    setStep('confirming');
    try {
      await W3.contribute(campaign.id, parseFloat(amount));
      setStep('success');
    } catch (e) {
      setErr(e.message?.slice(0, 120) || 'Transaction failed');
      setStep('confirm');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(45,52,54,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#F8F9FA', borderRadius: 10, padding: 28, width: 420, boxShadow: '0 8px 40px rgba(45,52,54,0.15)', border: '1px solid #E8EAED' }}>
        {step === 'success' ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 14, color: '#6B9B7E' }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#2D3436', marginBottom: 8, letterSpacing: '-0.3px' }}>Contribution confirmed</div>
            <div style={{ color: '#6B7280', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>{amount} ETH sent to <strong style={{ color: '#2D3436' }}>{campaign.title}</strong></div>
            <div style={{ background: '#E8EAED', borderRadius: 8, padding: '12px', marginBottom: 20, textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reward tokens — pending distribution</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#F4B942' }}>~{tokens} {TOKEN_SYMBOL}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, lineHeight: 1.5 }}>Final share depends on total ETH raised. Creator calls distributeRewards after the deadline.</div>
            </div>
            <Btn onClick={onClose} style={{ width: '100%' }}>Done</Btn>
          </div>
        ) : step === 'confirming' ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>Waiting for MetaMask confirmation…</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>Please approve the transaction in your wallet</div>
          </div>
        ) : step === 'confirm' ? (
          <>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#2D3436', marginBottom: 20 }}>Confirm contribution</div>
            <div style={{ border: '1px solid #E8EAED', borderRadius: 8, overflow: 'hidden', marginBottom: 18 }}>
              {[
                ['Campaign', campaign.title],
                ['Amount', `${amount} ETH`],
                ['Goal progress', `${campaign.raised.toFixed(4)} / ${campaign.goal} ETH`],
                ['Reward (est.)', `~${tokens} ${TOKEN_SYMBOL}`],
              ].map(([k, v], i, arr) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 14px', borderBottom: i < arr.length - 1 ? '1px solid #E8EAED' : 'none', background: i % 2 === 0 ? '#F8F9FA' : '#FAFAFA' }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: k.startsWith('Reward') ? '#F4B942' : '#2D3436' }}>{v}</span>
                </div>
              ))}
            </div>
            {err && <div style={{ fontSize: 12, color: '#E74C3C', marginBottom: 12, lineHeight: 1.5 }}>{err}</div>}
            <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 18 }}>ETH is held by the per-campaign RefundContract. If the goal isn't met by the deadline, you can refund from the <strong>My Contributions</strong> tab.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" onClick={() => { setStep('input'); setErr(''); }} style={{ flex: 1 }}>Back</Btn>
              <Btn onClick={handleConfirm} style={{ flex: 1 }}>Confirm</Btn>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#2D3436' }}>Support campaign</div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9CA3AF' }}>×</button>
            </div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 18 }}>{campaign.title}</div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount (ETH)</label>
              <div style={{ position: 'relative' }}>
                <input value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01" placeholder="0.00"
                  style={{ width: '100%', padding: '12px 46px 12px 14px', borderRadius: 8, border: '1px solid #E8EAED', fontFamily: 'Space Mono, monospace', fontSize: 20, fontWeight: 700, color: '#2D3436', background: '#F8F9FA', boxSizing: 'border-box', outline: 'none' }} />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: 12 }}>ETH</span>
              </div>
            </div>
            {amount && parseFloat(amount) > 0 && (
              <div style={{ background: '#E8EAED', borderRadius: 7, padding: '10px 12px', marginBottom: 18, fontSize: 12, color: '#6B7280' }}>
                Est. reward: <strong style={{ color: '#F4B942' }}>~{tokens} {TOKEN_SYMBOL}</strong> — proportional to total ETH raised
              </div>
            )}
            {!window.W3?.connected && (
              <div style={{ background: '#F4B94214', borderRadius: 7, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: '#F4B942', fontWeight: 600 }}>
                Connect MetaMask to fund on-chain
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
              <Btn onClick={() => parseFloat(amount) > 0 && setStep('confirm')} style={{ flex: 1, opacity: parseFloat(amount) > 0 ? 1 : 0.4 }}>Continue</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CreateCampaignModal({ onClose }) {
  const [form, setForm] = useFD({ title: '', description: '', goal: '', deadline: '' });
  const [step, setStep] = useFD(1);
  const [deploying, setDeploying] = useFD(false);
  const [deployErr, setDeployErr] = useFD('');
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 7, border: '1px solid #E8EAED', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#2D3436', background: '#F8F9FA', boxSizing: 'border-box', outline: 'none' };

  const durationDays = form.deadline
    ? Math.max(1, Math.ceil((new Date(form.deadline) - new Date()) / 86400000))
    : 0;

  const handleDeploy = async () => {
    setDeployErr('');
    if (!window.W3?.connected) { setDeployErr('Connect MetaMask first'); return; }
    if (!form.title.trim()) { setDeployErr('Title required'); return; }
    if (!form.description.trim()) { setDeployErr('Description required'); return; }
    if (!(parseFloat(form.goal) > 0)) { setDeployErr('Goal must be > 0 ETH'); return; }
    if (durationDays < 1) { setDeployErr('Deadline must be at least 1 day from now'); return; }
    setDeploying(true);
    try {
      await W3.createCampaign(form.title.trim(), form.description.trim(), parseFloat(form.goal), durationDays);
      onClose();
    } catch (e) {
      setDeployErr(e.message?.slice(0, 120) || 'Deploy failed');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(45,52,54,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#F8F9FA', borderRadius: 10, padding: 28, width: 460, boxShadow: '0 8px 40px rgba(45,52,54,0.15)', border: '1px solid #E8EAED', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#2D3436' }}>
            {step === 1 ? 'Campaign details' : 'Review & deploy'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9CA3AF' }}>×</button>
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 22 }}>Step {step} of 2</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          {[1,2].map(s => <div key={s} style={{ flex: 1, height: 2, borderRadius: 99, background: step >= s ? '#2D3436' : '#E8EAED', transition: 'background 0.3s' }} />)}
        </div>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Title</label>
              <input value={form.title} onChange={e => upd('title', e.target.value)} type="text" placeholder="e.g. GreenTech Solar Grid" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
              <textarea value={form.description} onChange={e => upd('description', e.target.value)} placeholder="Describe your campaign..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Goal (ETH)</label>
                <input value={form.goal} onChange={e => upd('goal', e.target.value)} type="number" step="0.01" placeholder="1.0" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deadline</label>
                <input value={form.deadline} onChange={e => upd('deadline', e.target.value)} type="date" style={inputStyle} />
              </div>
            </div>
            <div style={{ background: '#E8EAED', borderRadius: 7, padding: 12, fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
              Contributors receive reward tokens ({TOKEN_SYMBOL}) proportional to their share of total ETH raised — distributed once you call <em>distributeRewards</em> from <strong>My Campaigns</strong> after the deadline.
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <div style={{ border: '1px solid #E8EAED', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
              {[
                ['Title', form.title || '—'],
                ['Description', (form.description || '—').slice(0, 80) + (form.description?.length > 80 ? '…' : '')],
                ['Goal', form.goal ? `${form.goal} ETH` : '—'],
                ['Deadline', form.deadline || '—'],
                ['Duration', durationDays > 0 ? `${durationDays} days` : '—'],
                ['Reward', `Proportional ${TOKEN_SYMBOL} on success`],
              ].map(([k, v], i, arr) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid #E8EAED' : 'none', background: i % 2 === 0 ? '#F8F9FA' : '#FAFAFA' }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#2D3436', textAlign: 'right', maxWidth: 260 }}>{v}</span>
                </div>
              ))}
            </div>
            {!window.W3?.connected && (
              <div style={{ background: '#F4B94214', borderRadius: 7, padding: '8px 12px', marginBottom: 12, fontSize: 11, color: '#F4B942', fontWeight: 600 }}>
                Connect MetaMask to deploy on-chain
              </div>
            )}
            {deployErr && <div style={{ fontSize: 12, color: '#E74C3C', marginBottom: 12, lineHeight: 1.5 }}>{deployErr}</div>}
            <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.6 }}>
              Calls <code style={{ background: '#E8EAED', padding: '1px 4px', borderRadius: 3 }}>Crowdfunding.createCampaign</code>, which deploys one RefundContract (ETH vault) + one RewardsAndHistory (bookkeeper) for this campaign.
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <Btn variant="ghost" onClick={() => step > 1 ? setStep(s => s - 1) : onClose()} style={{ flex: 1 }}>{step > 1 ? 'Back' : 'Cancel'}</Btn>
          <Btn
            onClick={() => step < 2 ? setStep(s => s + 1) : handleDeploy()}
            style={{ flex: 1, opacity: deploying ? 0.6 : 1 }}
          >{deploying ? 'Deploying…' : step === 2 ? 'Deploy Campaign' : 'Continue'}</Btn>
        </div>
      </div>
    </div>
  );
}

function CampaignDetailModal({ campaign: c, onClose, onContribute }) {
  const [contributors, setContributors] = useFD([]);
  const pct = Math.min(100, Math.round((c.raised / c.goal) * 100));
  const { label: sLabel, color: sColor } = statusMeta(c.status);
  const barColor = c.status === 'active' ? '#2D3436' : c.status === 'funded' ? '#6B9B7E' : '#E8EAED';
  const isMine = window.W3?.account?.toLowerCase() === c.creatorFull?.toLowerCase();

  useFDFX(() => {
    let cancelled = false;
    if (window.W3?.connected) {
      W3.getContributors(c.id).then(rows => { if (!cancelled) setContributors(rows); }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [c.id]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(45,52,54,0.35)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#F8F9FA', borderRadius: 10, width: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(45,52,54,0.15)', border: '1px solid #E8EAED' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E8EAED', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <Badge label={sLabel} color={sColor} />
              {isMine && <Badge label="your campaign" color="#658BD6" />}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#2D3436', letterSpacing: '-0.3px', lineHeight: 1.3 }}>{c.title}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, fontFamily: 'Space Mono, monospace' }}>creator {c.creator}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF', flexShrink: 0 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7, marginBottom: 22, whiteSpace: 'pre-wrap' }}>{c.description}</div>

          <div style={{ border: '1px solid #E8EAED', borderRadius: 8, padding: '16px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#2D3436', letterSpacing: '-0.8px' }}>{c.raised.toFixed(4)}</span>
                <span style={{ fontSize: 13, color: '#9CA3AF', marginLeft: 4 }}>/ {c.goal} ETH</span>
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: sColor }}>{pct}%</span>
            </div>
            <ProgressBar value={c.raised} max={c.goal} color={barColor} height={4} />
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
              {[
                ['Supporters', c.contributors],
                ['Deadline', c.deadline],
                ['Status', c.daysLeft > 0 ? `${c.daysLeft}d left` : 'Ended'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#2D3436' }}>{v}</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{k}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border: '1px solid #E8EAED', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reward tokens</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F4B942' }}>Proportional {TOKEN_SYMBOL} share of 1000 per campaign</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Distributed via <code style={{ background: '#E8EAED', padding: '1px 4px', borderRadius: 3 }}>distributeRewards</code> after deadline if funded</div>
          </div>

          {contributors.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Contributors ({contributors.length})</div>
              <div style={{ border: '1px solid #E8EAED', borderRadius: 8, overflow: 'hidden' }}>
                {contributors.slice(0, 6).map((ct, i) => (
                  <div key={ct.address} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 14px', borderBottom: i < Math.min(5, contributors.length - 1) ? '1px solid #E8EAED' : 'none', background: i % 2 === 0 ? '#F8F9FA' : '#FAFAFA' }}>
                    <span style={{ fontSize: 12, fontFamily: 'Space Mono, monospace', color: '#2D3436' }}>{ct.short}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#2D3436' }}>{ct.eth.toFixed(4)} ETH{ct.claimed ? ` · ${ct.tokens.toFixed(0)} ${TOKEN_SYMBOL}` : ''}</span>
                  </div>
                ))}
                {contributors.length > 6 && (
                  <div style={{ padding: '8px 14px', fontSize: 11, color: '#9CA3AF', background: '#F8F9FA' }}>+ {contributors.length - 6} more</div>
                )}
              </div>
            </div>
          )}

          {c.status === 'active' && <Btn onClick={() => { onClose(); onContribute(c); }} style={{ width: '100%', padding: '11px', fontSize: 14 }}>Support this Campaign</Btn>}
          {c.status === 'funded' && <div style={{ textAlign: 'center', padding: '11px', borderRadius: 6, border: '1px solid #6B9B7E', color: '#6B9B7E', fontWeight: 700, fontSize: 14 }}>✓ Goal reached — creator can withdraw</div>}
          {c.status === 'failed' && <div style={{ textAlign: 'center', padding: '11px', borderRadius: 6, border: '1px solid #E8EAED', color: '#9CA3AF', fontSize: 13 }}>Campaign ended — contributors can refund</div>}
        </div>
      </div>
    </div>
  );
}

function CampaignPost({ campaign: c, onContribute, onDetail }) {
  const pct = Math.min(100, Math.round((c.raised / c.goal) * 100));
  const { label: sLabel, color: sColor } = statusMeta(c.status);
  const barColor = c.status === 'active' ? '#2D3436' : c.status === 'funded' ? '#6B9B7E' : '#E8EAED';
  const avatarColors = ['#658BD6','#6B9B7E','#8AB8A0','#2D3436','#658BD6','#6B9B7E'];
  const aColor = avatarColors[c.id % avatarColors.length];

  return (
    <div style={{ background: '#F8F9FA', borderBottom: '1px solid #E8EAED', padding: '20px' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <Avatar name={c.creator.replace('0x', '')} size={38} color={aColor} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2D3436', fontFamily: 'Space Mono, monospace' }}>{c.creator}</span>
            <span style={{ fontSize: 12, color: '#D1D5DB' }}>·</span>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>{c.daysLeft > 0 ? `${c.daysLeft}d left` : 'Ended'}</span>
            <span style={{ marginLeft: 'auto' }}><Badge label={sLabel} color={sColor} /></span>
          </div>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>Campaign #{c.id}</span>
        </div>
      </div>

      <div onClick={() => onDetail(c)} style={{ cursor: 'pointer' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#2D3436', marginBottom: 6, lineHeight: 1.35, letterSpacing: '-0.2px' }}>{c.title}</div>
        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.description}</div>

        <div style={{ background: '#E8EAED', borderRadius: 8, padding: '14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#2D3436', letterSpacing: '-0.4px' }}>{c.raised.toFixed(4)} <span style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>/ {c.goal} ETH</span></span>
            <span style={{ fontSize: 14, fontWeight: 700, color: sColor }}>{pct}%</span>
          </div>
          <ProgressBar value={c.raised} max={c.goal} color={barColor} height={4} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{c.contributors} supporter{c.contributors !== 1 ? 's' : ''}</span>
            <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'Space Mono, monospace' }}>{TOKEN_SYMBOL}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {c.status === 'active' && <Btn onClick={() => onContribute(c)} small>Support</Btn>}
        {c.status === 'funded' && <span style={{ fontSize: 12, color: '#6B9B7E', fontWeight: 600 }}>✓ Funded</span>}
        {c.status === 'failed' && <span style={{ fontSize: 12, color: '#E74C3C', fontWeight: 600 }}>Refundable</span>}
        <button onClick={() => onDetail(c)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E8EAED', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', marginLeft: 'auto' }}>Details</button>
      </div>
    </div>
  );
}

function FeedScreen({ onCompose }) {
  const [contributeTarget, setContributeTarget] = useFD(null);
  const [detailTarget, setDetailTarget] = useFD(null);
  const [showCreate, setShowCreate] = useFD(false);
  const sorted = [...(CF.campaigns || [])].sort((a, b) => b.raised - a.raised);
  const activeCount = sorted.filter(c => c.status === 'active').length;

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, background: 'rgba(248,249,250,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E8EAED', padding: '14px 20px', zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#2D3436' }}>Home</div>
        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{activeCount} active · {sorted.length} total</div>
      </div>

      <div style={{ background: '#F8F9FA', borderBottom: '1px solid #E8EAED', padding: '14px 20px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <Avatar name={(window.W3?.userProfile?.name || 'U').slice(0, 2)} size={36} color="#2D3436" />
        <div onClick={() => setShowCreate(true)} style={{ flex: 1, padding: '9px 14px', borderRadius: 6, border: '1px solid #E8EAED', color: '#9CA3AF', fontSize: 13, cursor: 'pointer' }}>
          Have a project? Launch a campaign...
        </div>
        <Btn onClick={() => setShowCreate(true)} small>Launch</Btn>
      </div>

      {sorted.map(c => <CampaignPost key={c.id} campaign={c} onContribute={setContributeTarget} onDetail={setDetailTarget} />)}

      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF', fontSize: 13 }}>
          {window.W3?.connected ? 'No campaigns yet. Launch the first one!' : 'Connect MetaMask to load on-chain campaigns.'}
        </div>
      )}

      {contributeTarget && <ContributeModal campaign={contributeTarget} onClose={() => setContributeTarget(null)} />}
      {detailTarget && <CampaignDetailModal campaign={detailTarget} onClose={() => setDetailTarget(null)} onContribute={c => { setDetailTarget(null); setContributeTarget(c); }} />}
      {showCreate && <CreateCampaignModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

window.FeedScreen = FeedScreen;
window.ContributeModal = ContributeModal;
window.CreateCampaignModal = CreateCampaignModal;
window.CampaignDetailModal = CampaignDetailModal;
window.statusMeta = statusMeta;
window.TOKEN_SYMBOL = TOKEN_SYMBOL;
