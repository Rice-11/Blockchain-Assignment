(() => {
  const state = {
    web3: null,
    account: null,
    contract: null,
  };

  const statusElement = document.getElementById("status");
  const accountElement = document.getElementById("account");
  const currentValueElement = document.getElementById("currentValue");
  const valueInput = document.getElementById("valueInput");

  function setStatus(message) {
    statusElement.textContent = `Status: ${message}`;
  }

  async function connectWallet() {
    if (!window.ethereum) {
      throw new Error("MetaMask is not available in this browser.");
    }

    state.web3 = new window.Web3(window.ethereum);
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });

    if (!accounts || accounts.length === 0) {
      throw new Error("No wallet account was returned.");
    }

    state.account = accounts[0];
    accountElement.textContent = `Account: ${state.account}`;
    setStatus("wallet connected");
  }

  async function loadContract() {
    if (!state.web3) {
      throw new Error("Connect wallet first.");
    }

    const artifactResponse = await fetch("../build/contracts/Main.json");
    if (!artifactResponse.ok) {
      throw new Error("Could not load build/contracts/Main.json. Run `npm run compile` and `npm run migrate`.");
    }

    const artifact = await artifactResponse.json();
    const networkId = await state.web3.eth.net.getId();
    const deployment = artifact.networks[networkId];

    if (!deployment) {
      throw new Error(`Main is not deployed on network ${networkId}. Run \`npm run migrate\`.`);
    }

    state.contract = new state.web3.eth.Contract(artifact.abi, deployment.address);
  }

  async function getValue() {
    if (!state.contract) {
      await loadContract();
    }

    const value = await state.contract.methods.getValue().call();
    currentValueElement.textContent = `Current value: ${value}`;
    setStatus("value fetched");
  }

  async function setValue() {
    if (!state.account) {
      throw new Error("Connect wallet first.");
    }
    if (!state.contract) {
      await loadContract();
    }

    const nextValue = Number(valueInput.value);
    if (!Number.isInteger(nextValue) || nextValue < 0) {
      throw new Error("Please enter a valid non-negative integer.");
    }

    setStatus("sending transaction...");
    await state.contract.methods.setValue(nextValue).send({ from: state.account });
    await getValue();
    setStatus("transaction confirmed");
  }

  document.getElementById("connectBtn").addEventListener("click", async () => {
    try {
      await connectWallet();
      await loadContract();
      await getValue();
    } catch (error) {
      setStatus(error.message);
    }
  });

  document.getElementById("setBtn").addEventListener("click", async () => {
    try {
      await setValue();
    } catch (error) {
      setStatus(error.message);
    }
  });

  document.getElementById("getBtn").addEventListener("click", async () => {
    try {
      await getValue();
    } catch (error) {
      setStatus(error.message);
    }
  });
})();
