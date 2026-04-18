// Funding Mechanism: Daniel Tay Yi Fung

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract Funding_Mechanism {
    address public owner;
    uint public goal;
    uint public deadline;
    uint public total_funds;
    uint public min_contribution = 0.01 ether;

    mapping(address => uint) public contributions;

    bool public goal_reached;
    bool public funds_withdrawn;

    event Funded(address indexed contributor, uint amount);
    event Withdrawn(uint amount);

    constructor(uint _goal, uint _duration_in_minutes) {
        owner = msg.sender;
        goal = _goal;
        deadline = block.timestamp + (_duration_in_minutes * 1 minutes);
    }

    function fund() public payable {
        require(block.timestamp < deadline, "Campaign ended");
        require(msg.value >= min_contribution, "Below minimum contribution");

        contributions[msg.sender] += msg.value;
        total_funds += msg.value;

        if (total_funds >= goal) {
            goal_reached = true;
        }

        emit Funded(msg.sender, msg.value);
    }

    function withdraw() public {
        require(msg.sender == owner, "Not owner");
        require(goal_reached, "Goal not reached");
        require(!funds_withdrawn, "ALready withdrawn");

        funds_withdrawn = true;

        uint amount = total_funds;
        total_funds = 0;

        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Withdraw failed");

        emit Withdrawn(amount);
    }

    function get_time_left() public view returns (uint) {
        if (block.timestamp >= deadline) {
            return 0;
        }

        return deadline - block.timestamp;
    }
}