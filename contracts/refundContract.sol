// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RefundContract {
    address payable public creator;
    uint256 public goal;
    uint256 public deadline;
    uint256 public amountRaised;
    bool public goalMet;
    bool public withdrawn;

    mapping(address => uint256) public contributions;

    enum State { Active, GoalMet, Failed }

    event Funded(address indexed contributor, uint256 amount);
    event Refunded(address indexed contributor, uint256 amount);
    event Withdrawn(address indexed creator, uint256 amount);
    event GoalReached(uint256 totalRaised);

    constructor(uint256 _goal, uint256 _durationDays) {
        require(_goal > 0, "Goal must be greater than zero");
        require(_durationDays > 0, "Duration must be at least 1 day");

        creator = payable(msg.sender);
        goal = _goal;
        deadline = block.timestamp + (_durationDays * 1 days);
    }

    function fund() external payable {
        require(getState() == State.Active, "Campaign is not active");
        require(msg.value > 0, "Must send ETH to fund");

        contributions[msg.sender] += msg.value;
        amountRaised += msg.value;

        if (amountRaised >= goal) {
            goalMet = true;
            emit GoalReached(amountRaised);
        }

        emit Funded(msg.sender, msg.value);
    }

    // Pull-refund: contributor calls this after campaign fails
    function refund() external {
        require(getState() == State.Failed, "Refunds only available if campaign failed");

        uint256 amount = contributions[msg.sender];
        require(amount > 0, "No contribution to refund");

        contributions[msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit Refunded(msg.sender, amount);
    }

    function withdraw() external {
        require(msg.sender == creator, "Only the creator can withdraw");
        require(goalMet, "Goal was not met");
        require(!withdrawn, "Funds already withdrawn");

        withdrawn = true;
        uint256 amount = address(this).balance;
        creator.transfer(amount);

        emit Withdrawn(creator, amount);
    }

    function getState() public view returns (State) {
        if (goalMet) return State.GoalMet;
        if (block.timestamp >= deadline) return State.Failed;
        return State.Active;
    }

    function getContribution(address contributor) external view returns (uint256) {
        return contributions[contributor];
    }
}
