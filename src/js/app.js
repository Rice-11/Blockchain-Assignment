(() => {
  const state = { web3: null, account: null, contract: null };

  const $ = (id) => document.getElementById(id);
  const statusEl      = $("status");
  const statusDot     = $("statusDot");
  const accountEl     = $("account");
  const accountBadge  = $("accountBadge");
  const networkBadge  = $("networkBadge");
  const valueDisplay  = $("valueDisplay");
  const valueHex      = $("valueHex");
  const valueInput    = $("valueInput");
  const valueReadout  = valueDisplay.closest(".value-readout");

  function setStatus(msg, state = "idle") {
    statusEl.textContent = msg;
    statusDot.className = "statusbar-dot";
    if (state === "ok")   statusDot.classList.add("ok");
    if (state === "busy") statusDot.classList.add("busy");
    if (state === "err")  statusDot.classList.add("err");
  }

  async function connectWallet() {
    if (!window.ethereum) {
      throw new Error("MetaMask not found — install it and reload.");
    }
    state.web3 = new window.Web3(window.ethereum);
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts || accounts.length === 0) throw new Error("No account returned.");

    state.account = accounts[0];
    const short = `${state.account.slice(0, 6)}…${state.account.slice(-4)}`;
    accountEl.textContent = state.account;
    accountEl.classList.add("connected");
    accountBadge.textContent = short;
    accountBadge.className = "badge badge--online";

    const netId = await state.web3.eth.net.getId();
    networkBadge.textContent = `net:${netId}`;
    networkBadge.className = "badge badge--online";

    $("chainNode1").classList.add("active");
    $("chainNode2").classList.add("active");
  }

  async function loadContract() {
    if (!state.web3) throw new Error("Connect wallet first.");
    const res = await fetch("../build/contracts/Main.json");
    if (!res.ok) throw new Error("Main.json not found — run: npm run compile && npm run migrate");
    const artifact = await res.json();
    const netId = await state.web3.eth.net.getId();
    const deployment = artifact.networks[netId];
    if (!deployment) throw new Error(`No deployment on network ${netId} — run: npm run migrate`);
    state.contract = new state.web3.eth.Contract(artifact.abi, deployment.address);
  }

  async function getValue() {
    if (!state.contract) await loadContract();
    const value = await state.contract.methods.getValue().call();

    valueDisplay.classList.remove("glitch");
    void valueDisplay.offsetWidth;
    valueDisplay.classList.add("glitch");
    setTimeout(() => valueDisplay.classList.remove("glitch"), 450);

    valueDisplay.textContent = value;
    valueDisplay.classList.add("has-value");

    const num = parseInt(value);
    valueHex.textContent = "0x" + num.toString(16).toUpperCase().padStart(4, "0");
    valueHex.classList.add("has-value");
    valueReadout.classList.add("has-value");

    setStatus("value fetched", "ok");
  }

  async function setValue() {
    if (!state.account) throw new Error("Connect wallet first.");
    if (!state.contract) await loadContract();
    const next = Number(valueInput.value);
    if (!Number.isInteger(next) || next < 0) throw new Error("Enter a valid non-negative integer.");
    setStatus("sending transaction…", "busy");
    await state.contract.methods.setValue(next).send({ from: state.account });
    await getValue();
    setStatus("transaction confirmed", "ok");
  }

  // Theme toggle
  (function () {
    const btn = $("themeToggle");
    function applyTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }
    applyTheme(localStorage.getItem("theme") || "dark");
    btn.addEventListener("click", () => {
      applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  })();

  $("connectBtn").addEventListener("click", async () => {
    try {
      setStatus("connecting…", "busy");
      await connectWallet();
      await loadContract();
      await getValue();
      setStatus("connected", "ok");
    } catch (e) { setStatus(e.message, "err"); }
  });

  $("setBtn").addEventListener("click", async () => {
    try { await setValue(); }
    catch (e) { setStatus(e.message, "err"); }
  });

  $("getBtn").addEventListener("click", async () => {
    try { await getValue(); }
    catch (e) { setStatus(e.message, "err"); }
  });
})();
