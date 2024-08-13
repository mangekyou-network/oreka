// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./OracleConsumer.sol";

contract BinaryOptionMarket is Ownable {
    enum Side { Long, Short }
    enum Phase { Bidding, Trading, Maturity, Expiry }

    struct OracleDetails {
        uint strikePrice;
        string finalPrice;
    }

    struct Position {
        uint long;
        uint short;
    }

    struct MarketFees {
        uint poolFee;
        uint creatorFee;
        uint refundFee;
    }

    OracleDetails public oracleDetails;
    OracleConsumer internal priceFeed;
    Position public positions;
    MarketFees public fees;
    uint public totalDeposited;
    bool public resolved;
    Phase public currentPhase;
    uint public feePercentage = 10; // 10% fee on rewards
    mapping(address => uint) public longBids;
    mapping(address => uint) public shortBids;
    mapping(address => bool) public hasClaimed;

    event Bid(Side side, address indexed account, uint value);
    event MarketResolved(string finalPrice, uint timeStamp);
    event RewardClaimed(address indexed account, uint value);
    event Withdrawal(address indexed user, uint amount);

    constructor(
        address _owner,
        address _coprocessor,
        uint _strikePrice
    ) Ownable(_owner) {
        priceFeed = OracleConsumer(_coprocessor);
        oracleDetails = OracleDetails(_strikePrice, "0");
        currentPhase = Phase.Bidding;
        transferOwnership(msg.sender); // Initialize the Ownable contract with the contract creator
    }

    function bid(Side side) public payable {
        require(currentPhase == Phase.Bidding, "Not in bidding phase");
        require(msg.value > 0, "Value must be greater than zero");

        if (side == Side.Long) {
            positions.long += msg.value;
            longBids[msg.sender] += msg.value;
        } else {
            positions.short += msg.value;
            shortBids[msg.sender] += msg.value;
        }

        totalDeposited += msg.value;
        emit Bid(side, msg.sender, msg.value);
    }

    function multiBid(Side[] memory sides, uint[] memory values) public payable {
        require(currentPhase == Phase.Bidding, "Not in bidding phase");
        require(sides.length == values.length, "Mismatched inputs");

        uint totalValue = 0;

        for (uint i = 0; i < sides.length; i++) {
            totalValue += values[i];
        }

        require(msg.value == totalValue, "Incorrect ETH amount for bids");

        for (uint i = 0; i < sides.length; i++) {
            if (sides[i] == Side.Long) {
                positions.long += values[i];
                longBids[msg.sender] += values[i];
            } else {
                positions.short += values[i];
                shortBids[msg.sender] += values[i];
            }

            totalDeposited += values[i];
            emit Bid(sides[i], msg.sender, values[i]);
        }
    }

    function resolveMarket() external onlyOwner {
        require(currentPhase == Phase.Trading, "Market not in trading phase");
        currentPhase = Phase.Maturity;

        (string memory price, uint updatedAt) = oraclePriceAndTimestamp();
        oracleDetails.finalPrice = price;
        resolved = true;
        emit MarketResolved(price, updatedAt);
    }

    function claimReward() external {
        require(currentPhase == Phase.Expiry, "Market not in expiry phase");
        require(resolved, "Market is not resolved yet");
        require(!hasClaimed[msg.sender], "Reward already claimed");

        uint finalPrice = parsePrice(oracleDetails.finalPrice);

        Side winningSide;
        if (finalPrice >= oracleDetails.strikePrice) {
            winningSide = Side.Long;
        } else {
            winningSide = Side.Short;
        }

        uint userDeposit;
        uint totalWinningDeposits;

        if (winningSide == Side.Long) {
            userDeposit = longBids[msg.sender];
            totalWinningDeposits = positions.long;
        } else {
            userDeposit = shortBids[msg.sender];
            totalWinningDeposits = positions.short;
        }

        require(userDeposit > 0, "No deposits on winning side");

        uint reward = (userDeposit * totalDeposited) / totalWinningDeposits;
        uint fee = (reward * feePercentage) / 100;
        uint finalReward = reward - fee;

        hasClaimed[msg.sender] = true;

        payable(msg.sender).transfer(finalReward);
        emit RewardClaimed(msg.sender, finalReward);
    }

    function withdraw() public {
        uint amount = address(this).balance;
        require(amount > 0, "No balance to withdraw.");

        payable(msg.sender).transfer(amount);

        emit Withdrawal(msg.sender, amount);
    }

    function oraclePriceAndTimestamp() public view returns (string memory price, uint updatedAt) {
        (, string memory answer, uint timeStamp, ) = priceFeed.latestRoundData();
        price = answer;
        updatedAt = timeStamp;
    }

    function startTrading() external onlyOwner {
        require(currentPhase == Phase.Bidding, "Market not in bidding phase");
        currentPhase = Phase.Trading;
    }

    function expireMarket() external onlyOwner {
        require(currentPhase == Phase.Maturity, "Market not in maturity phase");
        currentPhase = Phase.Expiry;
    }

    function setFeePercentage(uint _feePercentage) public onlyOwner {
        require(_feePercentage <= 20, "Fee percentage cannot exceed 20.");
        feePercentage = _feePercentage;
    }

    function parsePrice(string memory priceString) internal pure returns (uint) {
        bytes memory priceBytes = bytes(priceString);
        uint price = 0;

        for (uint i = 0; i < priceBytes.length; i++) {
            require(priceBytes[i] >= 0x30 && priceBytes[i] <= 0x39, "Invalid price string");
            price = price * 10 + (uint(uint8(priceBytes[i])) - 0x30);
        }

        return price;
    }
}
