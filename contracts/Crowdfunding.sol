// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./refundContract.sol";
import "./RewardsAndHistory.sol";

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
        address refundInstance;
        address rewardInstance;
    }
    mapping(uint256 => Campaign) public campaigns;
    uint256 public campaignCount;

    event CampaignCreated(
        uint256 indexed id,
        address indexed creator,
        string title,
        uint256 goal,
        uint256 deadline,
        address refundInstance,
        address rewardInstance
    );
    event Contributed(uint256 indexed id, address indexed contributor, uint256 amount);

    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _durationInDays
    ) external {
        //1 Validate input
        require(_goal > 0, "Goal must be greater than 0");
        require(_durationInDays > 0, "Duration must be greater than 0");
        //2 Increment campaignCount to get new Identifier
        campaignCount++;
        //3 Deploy per-campaign vault (RefundContract) and bookkeeper (RewardsAndHistory)
        RefundContract r = new RefundContract(_goal, _durationInDays, msg.sender);
        RewardsAndHistory h = new RewardsAndHistory(_goal, _durationInDays, msg.sender);
        //4 Store new campaign in mapping
        uint256 deadlineTs = block.timestamp + (_durationInDays * 1 days);
        campaigns[campaignCount] = Campaign({
            id: campaignCount,
            creator: msg.sender,
            title: _title,
            description: _description,
            goal: _goal,
            deadline: deadlineTs,
            amountRaised: 0,
            isComplete: false,
            isClaimed: false,
            refundInstance: address(r),
            rewardInstance: address(h)
        });

        emit CampaignCreated(campaignCount, msg.sender, _title, _goal, deadlineTs, address(r), address(h));
    }

    function contribute(uint256 _campaignId) external payable {
        Campaign storage c = campaigns[_campaignId];
        require(c.id != 0, "Campaign does not exist");
        require(msg.value > 0, "Must send ETH");

        RefundContract(payable(c.refundInstance)).fundFor{value: msg.value}(msg.sender);
        RewardsAndHistory(c.rewardInstance).record(msg.sender, msg.value);
        c.amountRaised += msg.value;

        emit Contributed(_campaignId, msg.sender, msg.value);
    }

    function getCampaign(uint256 _id) external view returns (Campaign memory) {
        return campaigns[_id];
    }
}
