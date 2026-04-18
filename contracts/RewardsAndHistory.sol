// Reward Distribution & Transaction History: Dylan Ng Kye Yin

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

contract RewardsAndHistory {

    // ─────────────────────────────────────────────────────────────
    //  State Variables
    // ─────────────────────────────────────────────────────────────

    address public owner;
    uint256 public goal;
    uint256 public deadline;
    uint256 public total_funds;
    bool    public goal_reached;

    // contributor address => amount they contributed (in wei)
    mapping(address => uint256) public contributions;

    // contributor address => reward tokens issued to them
    mapping(address => uint256) public rewardTokens;

    // contributor address => whether their reward has been claimed
    mapping(address => bool) public rewardClaimed;

    // keeps an ordered list of contributor addresses for iteration
    address[] private contributorList;

    // ─────────────────────────────────────────────────────────────
    //  Structs
    // ─────────────────────────────────────────────────────────────

    // A single record in a user's transaction history
    struct TransactionRecord {
        string  recordType;    // "contribution" or "reward"
        uint256 amount;        // ETH contributed (in wei)
        uint256 tokens;        // reward tokens issued (0 for contribution records)
        uint256 timestamp;     // when the event occurred
    }

    // ─────────────────────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────────────────────

    event Funded(address indexed contributor, uint256 amount);
    event RewardIssued(address indexed contributor, uint256 tokens);

    // ─────────────────────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────────────────────

    constructor(uint256 _goal, uint256 _duration_in_days) {
        require(_goal > 0, "Goal must be greater than zero");
        require(_duration_in_days > 0, "Duration must be at least 1 day");

        owner    = msg.sender;
        goal     = _goal;
        deadline = block.timestamp + (_duration_in_days * 1 days);
    }

    // ─────────────────────────────────────────────────────────────
    //  Fund function (needed so contributions are recorded)
    // ─────────────────────────────────────────────────────────────

    function fund() external payable {
        require(block.timestamp < deadline, "Campaign has ended");
        require(msg.value > 0, "Must send ETH to fund");

        // Track new contributors for reward iteration
        if (contributions[msg.sender] == 0) {
            contributorList.push(msg.sender);
        }

        contributions[msg.sender] += msg.value;
        total_funds += msg.value;

        if (total_funds >= goal) {
            goal_reached = true;
        }

        emit Funded(msg.sender, msg.value);
    }

    // ─────────────────────────────────────────────────────────────
    //  FUNCTION 1 — distributeRewards
    //
    //  Reward Distribution: contributors receive tokens representing
    //  their support or stake in the project, proportional to how
    //  much they contributed relative to the total funds raised.
    //
    //  Token formula:
    //      tokens = (contribution / total_funds) * 1000
    //  Scaled by 1e18 to support 18 decimal places (standard token).
    //
    //  Rules:
    //  - Only callable after the deadline has passed
    //  - Only callable if the funding goal was reached
    //  - Contributors already rewarded are skipped (no double reward)
    //  - Only the owner can trigger distribution
    // ─────────────────────────────────────────────────────────────

    function distributeRewards() external {
        require(msg.sender == owner, "Only owner can distribute rewards");
        require(block.timestamp >= deadline, "Campaign has not ended yet");
        require(goal_reached, "Goal was not reached — no rewards to distribute");
        require(contributorList.length > 0, "No contributors to reward");

        for (uint256 i = 0; i < contributorList.length; i++) {
            address contributor = contributorList[i];

            // Skip contributors who have already received their reward
            if (rewardClaimed[contributor]) {
                continue;
            }

            uint256 contributed = contributions[contributor];
            if (contributed == 0) continue;

            // Calculate proportional reward tokens
            // Formula: (contributor share / total raised) * 1000 tokens
            uint256 tokens = (contributed * 1000 * 1e18) / total_funds;

            // Record and mark as claimed to prevent double rewarding
            rewardTokens[contributor]  = tokens;
            rewardClaimed[contributor] = true;

            emit RewardIssued(contributor, tokens);
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  FUNCTION 2 — getTransactionHistory
    //
    //  Transaction History: users can view their campaign
    //  participation and transaction history. Returns an array of
    //  TransactionRecord structs — one for their contribution and
    //  one for their reward (if issued). Returns an empty array if
    //  the caller has not participated.
    //
    //  This is a view function — costs no gas when called externally.
    // ─────────────────────────────────────────────────────────────

    function getTransactionHistory()
        external
        view
        returns (TransactionRecord[] memory)
    {
        uint256 contributed = contributions[msg.sender];

        // Return empty array if the caller has not contributed
        if (contributed == 0) {
            return new TransactionRecord[](0);
        }

        uint256 tokens   = rewardTokens[msg.sender];
        bool    rewarded = rewardClaimed[msg.sender];

        // Allocate: 1 contribution record + 1 reward record if applicable
        uint256 size = rewarded ? 2 : 1;
        TransactionRecord[] memory records = new TransactionRecord[](size);

        // Record 1 — contribution entry
        records[0] = TransactionRecord({
            recordType: "contribution",
            amount:     contributed,
            tokens:     0,
            timestamp:  deadline
        });

        // Record 2 — reward entry (only added if reward was issued)
        if (rewarded) {
            records[1] = TransactionRecord({
                recordType: "reward",
                amount:     contributed,
                tokens:     tokens,
                timestamp:  deadline
            });
        }

        return records;
    }

    // ─────────────────────────────────────────────────────────────
    //  Helper — check a specific contributor's reward balance
    // ─────────────────────────────────────────────────────────────

    function getRewardBalance(address contributor) external view returns (uint256) {
        return rewardTokens[contributor];
    }

    // ─────────────────────────────────────────────────────────────
    //  Helper — get total number of contributors
    // ─────────────────────────────────────────────────────────────

    function getContributorCount() external view returns (uint256) {
        return contributorList.length;
    }
}
