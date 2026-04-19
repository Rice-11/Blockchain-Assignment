// Web3 bridge — connects ChainFund UI to Ethereum smart contracts.
// Exposes window.W3 as the single source of truth for on-chain state.
// CF.* objects are mirrors populated from chain data — no hardcoded mocks.
window.W3 = {
  connected: false,
  web3: null,
  account: null,
  netId: null,
  crowdfunding: null,
  userManagement: null,
  registered: false,
  userProfile: null,
  _abis: {},
  _listeners: [],

  onUpdate(fn) {
    this._listeners.push(fn);
  },
  _notify() {
    this._listeners.forEach(fn => fn());
  },

  async _loadArtifact(name) {
    const res = await fetch(`../build/contracts/${name}.json`);
    if (!res.ok) throw new Error(`${name}.json not found — run: npm run compile && npm run migrate`);
    return res.json();
  },

  // ── connect / bootstrap ─────────────────────────────────────────
  async connect() {
    if (!window.ethereum) throw new Error('MetaMask not found — please install it');
    this.web3 = new window.Web3(window.ethereum);

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts.length) throw new Error('No accounts returned from MetaMask');
    this.account = accounts[0];
    this.netId = await this.web3.eth.net.getId();

    const [cfArt, umArt, rfArt, rhArt] = await Promise.all([
      this._loadArtifact('Crowdfunding'),
      this._loadArtifact('UserManagement'),
      this._loadArtifact('RefundContract'),
      this._loadArtifact('RewardsAndHistory'),
    ]);

    const cfDep = cfArt.networks[this.netId];
    const umDep = umArt.networks[this.netId];
    if (!cfDep) throw new Error(`Crowdfunding not deployed on network ${this.netId} — run: npm run migrate`);

    this._abis = { rf: rfArt.abi, rh: rhArt.abi };
    this.crowdfunding = new this.web3.eth.Contract(cfArt.abi, cfDep.address);
    if (umDep) {
      this.userManagement = new this.web3.eth.Contract(umArt.abi, umDep.address);
    }

    await this._refreshWallet();
    await this._refreshUser();
    await this._loadCampaigns();
    await this._loadTransactions();
    this.connected = true;
    this._notify();

    window.ethereum.on?.('accountsChanged', async (accs) => {
      if (!accs.length) return;
      this.account = accs[0];
      await this._refreshWallet();
      await this._refreshUser();
      await this._loadCampaigns();
      await this._loadTransactions();
      this._notify();
    });
  },

  // ── wallet + user ──────────────────────────────────────────────
  async _refreshWallet() {
    if (!this.account || !this.web3) return;
    const wei = await this.web3.eth.getBalance(this.account);
    const eth = parseFloat(this.web3.utils.fromWei(String(wei), 'ether'));
    const short = this.account.slice(0, 6) + '...' + this.account.slice(-4);
    CF.wallets = [{
      id: 'w1',
      label: 'MetaMask Wallet',
      address: this.account,
      short,
      ethBalance: parseFloat(eth.toFixed(4)),
      color: '#658BD6',
      txCount: 0,
      addedDate: new Date().toISOString().slice(0, 10),
    }];
    CF.wallet = CF.wallets[0];
  },

  async _refreshUser() {
    if (!this.userManagement || !this.account) {
      this.registered = false;
      this.userProfile = null;
      return;
    }
    try {
      this.registered = await this.userManagement.methods.registerCheck().call({ from: this.account });
      if (this.registered) {
        const u = await this.userManagement.methods.getUser(this.account).call();
        this.userProfile = { name: u.name, email: u.email };
      } else {
        this.userProfile = null;
      }
    } catch (e) {
      this.registered = false;
      this.userProfile = null;
    }
  },

  // ── campaigns ──────────────────────────────────────────────────
  async _loadCampaigns() {
    if (!this.crowdfunding) return;
    try {
      const count = Number(await this.crowdfunding.methods.campaignCount().call());
      if (count === 0) { CF.campaigns = []; return; }
      const now = Math.floor(Date.now() / 1000);
      const campaigns = [];
      for (let i = 1; i <= count; i++) {
        const c = await this.crowdfunding.methods.getCampaign(i).call();
        const raised = parseFloat(this.web3.utils.fromWei(String(c.amountRaised), 'ether'));
        const goal = parseFloat(this.web3.utils.fromWei(String(c.goal), 'ether'));
        const deadline = Number(c.deadline);
        const daysLeft = Math.max(0, Math.ceil((deadline - now) / 86400));
        let status = 'active';
        if (raised >= goal) status = 'funded';
        else if (now >= deadline) status = 'failed';

        // Contributor count from RewardsAndHistory
        let contributors = 0;
        try {
          contributors = Number(await new this.web3.eth.Contract(this._abis.rh, c.rewardInstance)
            .methods.getContributorCount().call());
        } catch {}

        campaigns.push({
          id: Number(c.id),
          title: c.title,
          description: c.description,
          creator: c.creator.slice(0, 6) + '...' + c.creator.slice(-4),
          creatorFull: c.creator,
          goal,
          raised,
          contributors,
          deadline: new Date(deadline * 1000).toISOString().slice(0, 10),
          deadlineTs: deadline,
          daysLeft,
          status,
          _refundInstance: c.refundInstance,
          _rewardInstance: c.rewardInstance,
        });
      }
      CF.campaigns = campaigns;
    } catch (e) {
      console.warn('Could not load on-chain campaigns:', e.message);
    }
  },

  // Per-campaign contributor addresses (for creator view)
  async getContributors(campaignId) {
    const c = (CF.campaigns || []).find(x => x.id === Number(campaignId));
    if (!c?._rewardInstance) return [];
    const rh = new this.web3.eth.Contract(this._abis.rh, c._rewardInstance);
    const addrs = await rh.methods.getContributors().call();
    const rows = await Promise.all(addrs.map(async (addr) => {
      const wei = await rh.methods.contributions(addr).call();
      const tokensWei = await rh.methods.rewardTokens(addr).call();
      const claimed = await rh.methods.rewardClaimed(addr).call();
      return {
        address: addr,
        short: addr.slice(0, 6) + '...' + addr.slice(-4),
        eth: parseFloat(this.web3.utils.fromWei(String(wei), 'ether')),
        tokens: parseFloat(this.web3.utils.fromWei(String(tokensWei), 'ether')),
        claimed,
      };
    }));
    return rows;
  },

  // Per-campaign caller history (contribution + reward rows)
  async getCampaignHistory(campaignId) {
    const c = (CF.campaigns || []).find(x => x.id === Number(campaignId));
    if (!c?._rewardInstance) return [];
    const rh = new this.web3.eth.Contract(this._abis.rh, c._rewardInstance);
    try {
      const rows = await rh.methods.getTransactionHistory().call({ from: this.account });
      return rows.map(r => ({
        recordType: r.recordType,
        amount: parseFloat(this.web3.utils.fromWei(String(r.amount), 'ether')),
        tokens: parseFloat(this.web3.utils.fromWei(String(r.tokens), 'ether')),
        timestamp: Number(r.timestamp),
        campaignId: c.id,
        campaignTitle: c.title,
      }));
    } catch {
      return [];
    }
  },

  // Per-campaign caller's contribution (wei)
  async getMyContribution(campaignId) {
    const c = (CF.campaigns || []).find(x => x.id === Number(campaignId));
    if (!c?._rewardInstance) return 0;
    const rh = new this.web3.eth.Contract(this._abis.rh, c._rewardInstance);
    try {
      const wei = await rh.methods.contributions(this.account).call();
      return parseFloat(this.web3.utils.fromWei(String(wei), 'ether'));
    } catch {
      return 0;
    }
  },

  // Per-campaign caller's reward token balance
  async getMyTokens(campaignId) {
    const c = (CF.campaigns || []).find(x => x.id === Number(campaignId));
    if (!c?._rewardInstance) return 0;
    const rh = new this.web3.eth.Contract(this._abis.rh, c._rewardInstance);
    try {
      const wei = await rh.methods.rewardTokens(this.account).call();
      return parseFloat(this.web3.utils.fromWei(String(wei), 'ether'));
    } catch {
      return 0;
    }
  },

  // ── transactions (aggregated across campaigns) ────────────────
  async _loadTransactions() {
    if (!this.crowdfunding) return;
    CF.transactions = [];
    const out = [];
    for (const c of (CF.campaigns || [])) {
      const rows = await this.getCampaignHistory(c.id);
      for (const r of rows) {
        out.push({
          id: `c${c.id}-${r.recordType}`,
          hash: c._rewardInstance.slice(0, 6) + '...' + c._rewardInstance.slice(-4),
          type: r.recordType === 'contribution' ? 'Contribution' : 'Token Reward',
          campaign: r.campaignTitle,
          campaignId: c.id,
          amount: r.amount,
          token: r.recordType === 'reward' ? `${r.tokens.toFixed(2)} CFT` : null,
          status: 'confirmed',
          date: new Date(r.timestamp * 1000).toISOString().slice(0, 10),
          direction: r.recordType === 'reward' ? 'in' : 'out',
        });
      }
    }
    // Sort newest first by timestamp (date string descending works because ISO)
    out.sort((a, b) => (a.date < b.date ? 1 : -1));
    CF.transactions = out;
  },

  // ── mutations ──────────────────────────────────────────────────
  async contribute(campaignId, ethAmount) {
    if (!this.crowdfunding || !this.account) throw new Error('Wallet not connected');
    const wei = this.web3.utils.toWei(String(ethAmount), 'ether');
    await this.crowdfunding.methods.contribute(campaignId).send({ from: this.account, value: wei });
    await this._refreshWallet();
    await this._loadCampaigns();
    await this._loadTransactions();
    this._notify();
  },

  async createCampaign(title, description, goalEth, durationDays) {
    if (!this.crowdfunding || !this.account) throw new Error('Wallet not connected');
    const goalWei = this.web3.utils.toWei(String(goalEth), 'ether');
    await this.crowdfunding.methods
      .createCampaign(title, description, goalWei, Math.max(1, durationDays))
      .send({ from: this.account });
    await this._loadCampaigns();
    await this._loadTransactions();
    this._notify();
  },

  async sendEth(toAddress, ethAmount) {
    if (!this.web3 || !this.account) throw new Error('Wallet not connected');
    await this.web3.eth.sendTransaction({
      from: this.account,
      to: toAddress,
      value: this.web3.utils.toWei(String(ethAmount), 'ether'),
    });
    await this._refreshWallet();
    this._notify();
  },

  async refund(campaignId) {
    const c = (CF.campaigns || []).find(x => x.id === Number(campaignId));
    if (!c?._refundInstance) throw new Error('Refund contract not available');
    const rf = new this.web3.eth.Contract(this._abis.rf, c._refundInstance);
    await rf.methods.refund().send({ from: this.account });
    await this._refreshWallet();
    await this._loadCampaigns();
    await this._loadTransactions();
    this._notify();
  },

  async withdraw(campaignId) {
    const c = (CF.campaigns || []).find(x => x.id === Number(campaignId));
    if (!c?._refundInstance) throw new Error('Withdraw contract not available');
    const rf = new this.web3.eth.Contract(this._abis.rf, c._refundInstance);
    await rf.methods.withdraw().send({ from: this.account });
    await this._refreshWallet();
    await this._loadCampaigns();
    this._notify();
  },

  async distributeRewards(campaignId) {
    const c = (CF.campaigns || []).find(x => x.id === Number(campaignId));
    if (!c?._rewardInstance) throw new Error('Rewards contract not available');
    const rh = new this.web3.eth.Contract(this._abis.rh, c._rewardInstance);
    await rh.methods.distributeRewards().send({ from: this.account });
    await this._loadCampaigns();
    await this._loadTransactions();
    this._notify();
  },

  async register(name, email) {
    if (!this.userManagement || !this.account) throw new Error('UserManagement not available');
    await this.userManagement.methods.register(name, email).send({ from: this.account });
    await this._refreshUser();
    this._notify();
  },

  async isRegistered() {
    if (!this.userManagement || !this.account) return false;
    try {
      return await this.userManagement.methods.registerCheck().call({ from: this.account });
    } catch (e) {
      return false;
    }
  },

  // ── analytics aggregation (computed from chain state) ─────────
  getAnalytics() {
    const campaigns = CF.campaigns || [];
    const totalRaised = campaigns.reduce((s, c) => s + c.raised, 0);
    const funded = campaigns.filter(c => c.status === 'funded').length;
    const failed = campaigns.filter(c => c.status === 'failed').length;
    const active = campaigns.filter(c => c.status === 'active').length;
    const concluded = funded + failed;
    const successRate = concluded === 0 ? null : Math.round((funded / concluded) * 100);
    const avgGoal = campaigns.length ? campaigns.reduce((s, c) => s + c.goal, 0) / campaigns.length : 0;

    // My participation stats (require account set)
    const mine = campaigns.filter(c => c.creatorFull?.toLowerCase() === (this.account || '').toLowerCase());
    const contributedTo = (CF.transactions || []).filter(t => t.type === 'Contribution');
    const totalContributed = contributedTo.reduce((s, t) => s + t.amount, 0);

    return {
      totalRaised, funded, failed, active,
      totalCampaigns: campaigns.length,
      successRate, avgGoal,
      myCreated: mine.length,
      myContributed: contributedTo.length,
      myTotalContributed: totalContributed,
    };
  },
};
