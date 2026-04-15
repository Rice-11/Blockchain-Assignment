// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Crowdfunding {
    struct Campaign {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 goal;
        uint256 deadline;
        uint256 amountRaised;
        bool isComplete;
        bool isClaimed;
    }
    mapping(uint256 => Campaign) public campaigns;
    uint256 public campaignCount;
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _durationInDays
    )external {
        //1 Validate input
        require(_goal > 0, "Goal must be greater than 0");
        require(_durationInDays > 0, "Duration must be greater than 0");
        //2 Increment campaignCount to get new Identifier
        campaignCount++;
        //3. Store new campaign in mapping
        campaigns[campaignCount] = Campaign({
            id: campaignCount,
            creator: msg.sender,
            title: _title,
            description: _description,
            goal: _goal,
            deadline: block.timestamp + (_durationInDays * 1 days),
            amountRaised: 0,
            isComplete: false,
            isClaimed: false
        });
    }
}
