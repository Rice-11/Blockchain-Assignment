// ChainFund — shared state containers.
// All data below is populated at runtime by web3-bridge.js from the deployed
// smart contracts. No hardcoded mock records; empty arrays keep screens
// renderable before the wallet is connected.
window.CF = {};

// Wallet view — overwritten to a single entry representing the connected
// MetaMask account once W3.connect() runs. Before connect, this is empty
// so screens show an explicit "connect wallet" empty state.
window.CF.wallets = [];
window.CF.wallet = null;

// Campaigns — mirrors Crowdfunding.campaigns (via Crowdfunding.getCampaign).
// Each entry carries the addresses of its per-campaign RefundContract and
// RewardsAndHistory instances under _refundInstance / _rewardInstance so
// UI code can dial into them for fund / refund / withdraw / rewards / history.
window.CF.campaigns = [];

// Transactions — aggregated from getTransactionHistory() across all campaigns
// the connected account has touched. Contribution + reward rows only; send/receive
// flows hit web3 directly and aren't tracked on a contract.
window.CF.transactions = [];
