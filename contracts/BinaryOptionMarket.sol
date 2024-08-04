// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "./OracleConsumer.sol";
import "openzeppelin-contracts/contracts/tokens/IERC20.sol";

contract BinaryOptionMarket is Ownable {
    using SafeMath for uint;

    enum Side { Long, Short }
    enum Phase { Bidding, Trading, Maturity, Expiry }

    struct OracleDetails {
        bytes32 key;
        uint strikePrice;
        uint finalPrice;
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
    IERC20 public sUSD;
    Position public positions;
    MarketFees public fees;
    uint public totalDeposited;
    bool public resolved;
    Phase public currentPhase;

    event Bid(Side side, address account, uint value);
    event MarketResolved(uint finalPrice, uint timeStamp);
    event Refund(Side side, address account, uint value);

    constructor(
        address _owner,
        address _coprocessor,
        address _tokenAddress,
        bytes32 _oracleKey,
        uint _strikePrice,
        uint _poolFee,
        uint _creatorFee,
        uint _refundFee
    ) Owned(_owner) {
        priceFeed = OracleConsumer(_coprocessor);
        sUSD = IERC20(_tokenAddress);
        oracleDetails = OracleDetails(_oracleKey, _strikePrice, 0);
        fees = MarketFees(_poolFee, _creatorFee, _refundFee);
        currentPhase = Phase.Bidding;
    }

    function bid(Side side, uint value) public {
        require(currentPhase == Phase.Bidding, "Not in bidding phase");
        require(value > 0, "Value must be greater than zero");
        sUSD.transferFrom(msg.sender, address(this), value);

        if (side == Side.Long) {
            positions.long = positions.long.add(value);
        } else {
            positions.short = positions.short.add(value);
        }

        totalDeposited = totalDeposited.add(value);
        emit Bid(side, msg.sender, value);
    }

    function refund(Side side, uint value) public {
        require(currentPhase == Phase.Bidding, "Refunds only during bidding");
        require(value > 0, "Value must be greater than zero");
        uint refundAmount = value.mul(SafeMath.sub(10000, fees.refundFee)).div(10000);

        if (side == Side.Long) {
            require(positions.long >= value, "Not enough balance to refund");
            positions.long = positions.long.sub(value);
        } else {
            require(positions.short >= value, "Not enough balance to refund");
            positions.short = positions.short.sub(value);
        }

        totalDeposited = totalDeposited.sub(value);
        sUSD.transfer(msg.sender, refundAmount);
        emit Refund(side, msg.sender, refundAmount);
    }

    function resolveMarket() external onlyOwner {
        require(currentPhase == Phase.Trading, "Market not in trading phase");
        currentPhase = Phase.Maturity;

        (uint price, uint updatedAt) = oraclePriceAndTimestamp();
        oracleDetails.finalPrice = price;
        resolved = true;
        emit MarketResolved(price, updatedAt);
    }

    function oraclePriceAndTimestamp() public view returns (uint price, uint updatedAt) {
        (, int256 answer, , uint timeStamp,) = priceFeed.latestRoundData();
        price = uint(answer);
        updatedAt = timeStamp;
    }
}
