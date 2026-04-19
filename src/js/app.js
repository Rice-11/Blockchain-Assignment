(() => {
  const state = {
    web3: null,
    account: null,
    netId: null,
    crowdfunding: null,
    userManagement: null,
    abis: {},
    campaigns: [],
  };

  const $ = (id) => document.getElementById(id);
  const statusEl      = $("status");
  const statusDot     = $("statusDot");
  const accountEl     = $("account");
  const accountBadge  = $("accountBadge");
  const networkBadge  = $("networkBadge");
  const balanceDisplay = $("balanceDisplay");
  const balanceHex    = $("balanceHex");
  const balanceReadout = $("balanceReadout");

  function setStatus(msg, level = "idle") {
    statusEl.textContent = msg;
    statusDot.className = "statusbar-dot";
    if (level === "ok")   statusDot.classList.add("ok");
    if (level === "busy") statusDot.classList.add("busy");
    if (level === "err")  statusDot.classList.add("err");
  }

  const fmtAddr = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
  const fmtEth  = (wei) => state.web3.utils.fromWei(String(wei), "ether");
  const toWei   = (eth) => state.web3.utils.toWei(String(eth), "ether");

  function fmtDeadline(tsSec) {
    const ms = Number(tsSec) * 1000;
    const d = new Date(ms);
    return d.toLocaleString();
  }

  function timeLeft(tsSec) {
    const now = Math.floor(Date.now() / 1000);
    const delta = Number(tsSec) - now;
    if (delta <= 0) return "ended";
    const days = Math.floor(delta / 86400);
    const hours = Math.floor((delta % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h left`;
    const mins = Math.floor((delta % 3600) / 60);
    return `${hours}h ${mins}m left`;
  }

  // ── ABI loading ─────────────────────────────────────────────
  async function loadArtifact(name) {
    const res = await fetch(`../build/contracts/${name}.json`);
    if (!res.ok) throw new Error(`${name}.json not found — run: npm run compile && npm run migrate`);
    return res.json();
  }

  async function loadAbis() {
    const [cf, um, rf, rh] = await Promise.all([
      loadArtifact("Crowdfunding"),
      loadArtifact("UserManagement"),
      loadArtifact("RefundContract"),
      loadArtifact("RewardsAndHistory"),
    ]);
    state.abis.Crowdfunding = cf.abi;
    state.abis.UserManagement = um.abi;
    state.abis.RefundContract = rf.abi;
    state.abis.RewardsAndHistory = rh.abi;
    return { cf, um };
  }

  // ── Wallet ──────────────────────────────────────────────────
  async function connectWallet() {
    if (!window.ethereum) throw new Error("MetaMask not found — install it and reload.");
    state.web3 = new window.Web3(window.ethereum);
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts?.length) throw new Error("No account returned.");

    state.account = accounts[0];
    accountEl.textContent = state.account;
    accountEl.classList.add("connected");
    accountBadge.textContent = fmtAddr(state.account);
    accountBadge.className = "badge badge--online";

    state.netId = await state.web3.eth.net.getId();
    networkBadge.textContent = `net:${state.netId}`;
    networkBadge.className = "badge badge--online";

    $("chainNode1").classList.add("active");
    $("chainNode2").classList.add("active");

    await refreshBalance();

    // Re-sync on account change
    if (window.ethereum.on && !state._wired) {
      state._wired = true;
      window.ethereum.on("accountsChanged", async (accs) => {
        if (!accs.length) return;
        state.account = accs[0];
        accountEl.textContent = state.account;
        accountBadge.textContent = fmtAddr(state.account);
        await refreshBalance();
        await bootstrapAfterConnect();
      });
    }
  }

  async function refreshBalance() {
    if (!state.account) return;
    const wei = await state.web3.eth.getBalance(state.account);
    const eth = fmtEth(wei);
    balanceDisplay.textContent = Number(eth).toFixed(4);
    balanceDisplay.classList.add("has-value");
    balanceHex.classList.add("has-value");
    balanceReadout.classList.add("has-value");
    return wei;
  }

  // ── Contract bootstrap ──────────────────────────────────────
  async function initTopLevelContracts(cfArtifact, umArtifact) {
    const cfDep = cfArtifact.networks[state.netId];
    const umDep = umArtifact.networks[state.netId];
    if (!cfDep) throw new Error(`Crowdfunding not deployed on net ${state.netId} — run: npm run migrate`);
    if (!umDep) throw new Error(`UserManagement not deployed on net ${state.netId} — run: npm run migrate`);
    state.crowdfunding   = new state.web3.eth.Contract(state.abis.Crowdfunding,   cfDep.address);
    state.userManagement = new state.web3.eth.Contract(state.abis.UserManagement, umDep.address);
  }

  function refundAt(addr)  { return new state.web3.eth.Contract(state.abis.RefundContract,    addr); }
  function rewardsAt(addr) { return new state.web3.eth.Contract(state.abis.RewardsAndHistory, addr); }

  // ── Registration flow ──────────────────────────────────────
  async function checkRegistered() {
    return state.userManagement.methods.registerCheck().call({ from: state.account });
  }

  async function bootstrapAfterConnect() {
    const registered = await checkRegistered();
    if (!registered) {
      $("registerPanel").hidden = false;
      $("createPanel").hidden = true;
      $("browsePanel").hidden = true;
      $("activityPanel").hidden = true;
      setStatus("register to continue", "busy");
      return;
    }
    $("registerPanel").hidden = true;
    $("createPanel").hidden = false;
    $("browsePanel").hidden = false;
    $("activityPanel").hidden = false;
    await loadCampaigns();
    setStatus("connected", "ok");
  }

  async function doRegister() {
    const name = $("regName").value.trim();
    const email = $("regEmail").value.trim();
    if (!name) throw new Error("Name required.");
    if (!email) throw new Error("Email required.");
    setStatus("registering…", "busy");
    await state.userManagement.methods.register(name, email).send({ from: state.account });
    setStatus("registered", "ok");
    await bootstrapAfterConnect();
  }

  // ── Campaigns: load + render ───────────────────────────────
  async function loadCampaigns() {
    const count = Number(await state.crowdfunding.methods.campaignCount().call());
    $("campaignCountBadge").textContent = String(count);
    $("campaignCountBadge").className = count > 0 ? "badge badge--online" : "badge badge--offline";

    const out = [];
    for (let i = 1; i <= count; i++) {
      const c = await state.crowdfunding.methods.getCampaign(i).call();
      out.push(c);
    }
    state.campaigns = out;
    renderBrowse();
    renderMyCampaigns();
    renderMyContributions();
  }

  function campaignStatus(c) {
    const now = Math.floor(Date.now() / 1000);
    if (Number(c.amountRaised) >= Number(c.goal)) return "met";
    if (now >= Number(c.deadline)) return "failed";
    return "active";
  }

  function cardHtml(c, extra = {}) {
    const pct = Math.min(100, (Number(c.amountRaised) / Number(c.goal)) * 100);
    const statusClass = campaignStatus(c);
    const statusLabel = statusClass === "met" ? "goal met" : statusClass === "failed" ? "failed" : "active";
    const raisedEth = fmtEth(c.amountRaised);
    const goalEth = fmtEth(c.goal);

    const actions = [];
    if (!extra.hideFund && statusClass === "active") {
      actions.push(`<button class="btn btn--accent" data-action="fund" data-id="${c.id}">fund</button>`);
    }
    if (extra.showCreatorActions) {
      if (statusClass === "met") {
        actions.push(`<button class="btn btn--accent" data-action="withdraw" data-id="${c.id}">withdraw</button>`);
      }
      const now = Math.floor(Date.now() / 1000);
      if (now >= Number(c.deadline) && statusClass === "met") {
        actions.push(`<button class="btn btn--ghost" data-action="distribute" data-id="${c.id}">distribute rewards</button>`);
      }
    }
    if (extra.showContributorActions) {
      if (statusClass === "failed") {
        actions.push(`<button class="btn btn--accent" data-action="refund" data-id="${c.id}">refund</button>`);
      }
      actions.push(`<button class="btn btn--ghost" data-action="history" data-id="${c.id}">history</button>`);
    }

    return `
      <article class="card" data-id="${c.id}">
        <div class="card-head">
          <span class="card-title">${escapeHtml(c.title)}</span>
          <span class="card-status card-status--${statusClass}">${statusLabel}</span>
        </div>
        <p class="card-desc">${escapeHtml(c.description)}</p>
        <div class="card-meta">
          <span><em>creator</em> ${fmtAddr(c.creator)}</span>
          <span><em>deadline</em> ${fmtDeadline(c.deadline)}</span>
          <span><em>status</em> ${timeLeft(c.deadline)}</span>
        </div>
        <div class="progress">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="card-meta">
          <span><em>raised</em> ${Number(raisedEth).toFixed(4)} ETH</span>
          <span><em>goal</em> ${Number(goalEth).toFixed(4)} ETH</span>
          <span><em>progress</em> ${pct.toFixed(1)}%</span>
        </div>
        <div class="card-actions">${actions.join(" ")}</div>
        <div class="card-extra" data-extra-for="${c.id}"></div>
      </article>
    `;
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }

  function renderBrowse() {
    const list = $("campaignList");
    if (state.campaigns.length === 0) {
      list.innerHTML = `<p class="empty-note">no campaigns yet — create the first one above.</p>`;
      return;
    }
    list.innerHTML = state.campaigns.map((c) => cardHtml(c)).join("");
  }

  async function renderMyCampaigns() {
    const pane = $("tab-mine");
    const mine = state.campaigns.filter(
      (c) => c.creator.toLowerCase() === state.account.toLowerCase()
    );
    if (mine.length === 0) {
      pane.innerHTML = `<p class="empty-note">campaigns you created will appear here.</p>`;
      return;
    }
    pane.innerHTML = mine.map((c) => cardHtml(c, { hideFund: true, showCreatorActions: true })).join("");

    // Load contributor lists for each
    for (const c of mine) {
      try {
        const contributors = await rewardsAt(c.rewardInstance).methods.getContributors().call();
        const extra = pane.querySelector(`[data-extra-for="${c.id}"]`);
        if (!extra) continue;
        if (contributors.length === 0) {
          extra.innerHTML = `<p class="contrib-note">no contributors yet.</p>`;
          continue;
        }
        const rows = await Promise.all(
          contributors.map(async (addr) => {
            const wei = await rewardsAt(c.rewardInstance).methods.contributions(addr).call();
            return `<li>${fmtAddr(addr)} — ${Number(fmtEth(wei)).toFixed(4)} ETH</li>`;
          })
        );
        extra.innerHTML = `<div class="contrib-block"><span class="contrib-label">contributors</span><ul class="contrib-list">${rows.join("")}</ul></div>`;
      } catch (e) {
        // non-fatal
      }
    }
  }

  async function renderMyContributions() {
    const pane = $("tab-contributions");
    const rows = [];
    for (const c of state.campaigns) {
      let wei = "0";
      try {
        wei = await rewardsAt(c.rewardInstance).methods.contributions(state.account).call();
      } catch (e) { continue; }
      if (String(wei) === "0") continue;
      rows.push({ c, wei });
    }
    if (rows.length === 0) {
      pane.innerHTML = `<p class="empty-note">campaigns you contributed to will appear here.</p>`;
      return;
    }
    pane.innerHTML = rows.map(({ c, wei }) => {
      const html = cardHtml(c, { hideFund: true, showContributorActions: true });
      return html.replace(
        '<div class="card-extra"',
        `<div class="contrib-block"><span class="contrib-label">your contribution</span><span class="contrib-amount">${Number(fmtEth(wei)).toFixed(4)} ETH</span></div><div class="card-extra"`
      );
    }).join("");
  }

  // ── Create campaign ─────────────────────────────────────────
  async function doCreate() {
    const title = $("cpTitle").value.trim();
    const description = $("cpDescription").value.trim();
    const goalEth = $("cpGoal").value;
    const duration = $("cpDuration").value;
    if (!title) throw new Error("Title required.");
    if (!description) throw new Error("Description required.");
    if (!goalEth || Number(goalEth) <= 0) throw new Error("Goal must be > 0.");
    if (!duration || Number(duration) < 1) throw new Error("Duration must be ≥ 1 day.");

    const goalWei = toWei(goalEth);
    setStatus("creating campaign…", "busy");
    await state.crowdfunding.methods
      .createCampaign(title, description, goalWei, Number(duration))
      .send({ from: state.account });
    $("cpTitle").value = ""; $("cpDescription").value = "";
    $("cpGoal").value = "";  $("cpDuration").value = "";
    setStatus("campaign created", "ok");
    await refreshBalance();
    await loadCampaigns();
  }

  // ── Fund modal ──────────────────────────────────────────────
  let pendingFundId = null;
  function openFundModal(id) {
    const c = state.campaigns.find((x) => Number(x.id) === Number(id));
    if (!c) return;
    pendingFundId = id;
    $("fundCampaignTitle").textContent = `fund: ${c.title}`;
    $("fundAmount").value = "";
    $("fundNote").textContent = "";
    // Mirror current wallet balance into modal
    $("fundBalanceDisplay").textContent = balanceDisplay.textContent;
    $("fundModal").hidden = false;
  }
  function closeFundModal() {
    $("fundModal").hidden = true;
    pendingFundId = null;
  }

  async function doFundConfirm() {
    if (!pendingFundId) return;
    const amountEth = $("fundAmount").value;
    if (!amountEth || Number(amountEth) <= 0) { $("fundNote").textContent = "enter an amount > 0"; return; }
    const weiToSend = state.web3.utils.toBN(toWei(amountEth));
    const balanceWei = state.web3.utils.toBN(await state.web3.eth.getBalance(state.account));
    if (balanceWei.lt(weiToSend)) {
      $("fundNote").textContent = `insufficient balance (have ${Number(fmtEth(balanceWei)).toFixed(4)} ETH)`;
      return;
    }
    setStatus("sending contribution…", "busy");
    try {
      await state.crowdfunding.methods.contribute(pendingFundId).send({
        from: state.account,
        value: weiToSend,
      });
      setStatus("contribution confirmed", "ok");
      closeFundModal();
      await refreshBalance();
      await loadCampaigns();
    } catch (e) {
      $("fundNote").textContent = e.message;
      setStatus(e.message, "err");
    }
  }

  // ── Creator/contributor actions ─────────────────────────────
  async function doWithdraw(id) {
    const c = state.campaigns.find((x) => Number(x.id) === Number(id));
    if (!c) return;
    setStatus("withdrawing…", "busy");
    await refundAt(c.refundInstance).methods.withdraw().send({ from: state.account });
    setStatus("withdrawn", "ok");
    await refreshBalance();
    await loadCampaigns();
  }

  async function doRefund(id) {
    const c = state.campaigns.find((x) => Number(x.id) === Number(id));
    if (!c) return;
    setStatus("refunding…", "busy");
    await refundAt(c.refundInstance).methods.refund().send({ from: state.account });
    setStatus("refunded", "ok");
    await refreshBalance();
    await loadCampaigns();
  }

  async function doDistribute(id) {
    const c = state.campaigns.find((x) => Number(x.id) === Number(id));
    if (!c) return;
    setStatus("distributing rewards…", "busy");
    await rewardsAt(c.rewardInstance).methods.distributeRewards().send({ from: state.account });
    setStatus("rewards distributed", "ok");
    await loadCampaigns();
  }

  async function doShowHistory(id) {
    const c = state.campaigns.find((x) => Number(x.id) === Number(id));
    if (!c) return;
    const rows = await rewardsAt(c.rewardInstance).methods.getTransactionHistory().call({ from: state.account });
    const extra = document.querySelector(`#tab-contributions [data-extra-for="${id}"]`);
    if (!extra) return;
    if (rows.length === 0) { extra.innerHTML = `<p class="contrib-note">no history for this account.</p>`; return; }
    const body = rows.map((r) => {
      const tokens = Number(state.web3.utils.fromWei(String(r.tokens), "ether")).toFixed(2);
      const amount = Number(fmtEth(r.amount)).toFixed(4);
      return `<li><em>${escapeHtml(r.recordType)}</em> amount ${amount} ETH · tokens ${tokens}</li>`;
    }).join("");
    extra.innerHTML = `<div class="contrib-block"><span class="contrib-label">history</span><ul class="contrib-list">${body}</ul></div>`;
  }

  // ── Wire-up ─────────────────────────────────────────────────
  (function wireTheme() {
    const btn = $("themeToggle");
    function applyTheme(t) {
      document.documentElement.setAttribute("data-theme", t);
      localStorage.setItem("theme", t);
      btn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }
    applyTheme(localStorage.getItem("theme") || "dark");
    btn.addEventListener("click", () =>
      applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark")
    );
  })();

  $("connectBtn").addEventListener("click", async () => {
    try {
      setStatus("loading artifacts…", "busy");
      const { cf, um } = await loadAbis();
      setStatus("connecting wallet…", "busy");
      await connectWallet();
      await initTopLevelContracts(cf, um);
      await bootstrapAfterConnect();
    } catch (e) { setStatus(e.message, "err"); }
  });

  $("registerBtn").addEventListener("click", async () => {
    try { await doRegister(); }
    catch (e) { setStatus(e.message, "err"); }
  });

  $("createBtn").addEventListener("click", async () => {
    try { await doCreate(); }
    catch (e) { setStatus(e.message, "err"); }
  });

  $("refreshBtn").addEventListener("click", async () => {
    try { setStatus("refreshing…", "busy"); await refreshBalance(); await loadCampaigns(); setStatus("refreshed", "ok"); }
    catch (e) { setStatus(e.message, "err"); }
  });

  // Delegated clicks inside campaign list / activity tabs
  document.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");
    try {
      if (action === "fund") openFundModal(id);
      else if (action === "withdraw") await doWithdraw(id);
      else if (action === "refund") await doRefund(id);
      else if (action === "distribute") await doDistribute(id);
      else if (action === "history") await doShowHistory(id);
    } catch (e) { setStatus(e.message, "err"); }
  });

  // Tab switching
  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((x) => x.classList.remove("tab-btn--active"));
      document.querySelectorAll(".tab-pane").forEach((x) => x.classList.remove("tab-pane--active"));
      b.classList.add("tab-btn--active");
      const tab = b.getAttribute("data-tab");
      $(`tab-${tab}`).classList.add("tab-pane--active");
    });
  });

  // Fund modal wiring
  $("fundCloseBtn").addEventListener("click", closeFundModal);
  $("fundCancelBtn").addEventListener("click", closeFundModal);
  $("fundBackdrop").addEventListener("click", closeFundModal);
  $("fundConfirmBtn").addEventListener("click", async () => {
    try { await doFundConfirm(); }
    catch (e) { $("fundNote").textContent = e.message; setStatus(e.message, "err"); }
  });
})();
