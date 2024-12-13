// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED
 * VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */

/**
 * If you are reading data feeds on L2 networks, you must
 * check the latest answer from the L2 Sequencer Uptime
 * Feed to ensure that the data is accurate in the event
 * of an L2 sequencer outage. See the
 * https://docs.chain.link/data-feeds/l2-sequencer-feeds
 * page for details.
 */

interface ISUSDe {
    function deposit(
        uint256 assets,
        address receiver
    ) external returns (uint256 shares);
    function cooldownAssets(uint256 assets) external;
    function unstake(address receiver) external;
    function convertToAssets(
        uint256 shares
    ) external view returns (uint256 assets);
}

contract BinaryOptionMarket is Ownable {
    enum Side {
        Long,
        Short
    }
    enum Phase {
        Starting,
        Bidding,
        Maturity,
        Expiry
    }

    struct OracleDetails {
        int strikePrice;
        int finalPrice;
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
    IPyth pyth;
    Position public positions;
    MarketFees public fees;

    uint public totalDeposited;
    bool public resolved;
    Phase public currentPhase;
    uint public feePercentage = 10; // 10% fee on rewards
    bytes32 priceFeedId;
    mapping(address => uint) public longBids;
    mapping(address => uint) public shortBids;
    mapping(address => bool) public hasClaimed;

    IERC20 public playToken;

    event Bid(Side side, address indexed account, uint value);
    event MarketResolved(int finalPrice, uint timeStamp);
    event RewardClaimed(address indexed account, uint value);
    event Withdrawal(address indexed user, uint amount);

    ISUSDe public sUSDe;
    bool public isStaked;
    uint256 public stakingTimestamp;
    uint256 public constant COOLDOWN_DURATION = 1 hours;

    constructor(
        address _owner,
        address _pythContract,
        bytes32 _priceFeedId,
        int _strikePrice,
        address _playToken,
        address _sUSDe
    ) Ownable(_owner) {
        pyth = IPyth(_pythContract);
        priceFeedId = _priceFeedId;
        oracleDetails = OracleDetails(_strikePrice, _strikePrice);
        currentPhase = Phase.Starting;
        playToken = IERC20(_playToken);
        transferOwnership(msg.sender); // Initialize the Ownable contract with the contract creator
        sUSDe = ISUSDe(_sUSDe);
    }

    mapping(address => Side) public userSelectedSide;

    function bid(Side side, uint256 amount) public {
        require(currentPhase == Phase.Bidding, "Not in bidding phase");
        require(amount > 0, "Value must be greater than zero");

        require(
            playToken.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );

        if (side == Side.Long) {
            positions.long += amount;
            longBids[msg.sender] += amount;
        } else {
            positions.short += amount;
            shortBids[msg.sender] += amount;
        }

        userSelectedSide[msg.sender] = side;

        totalDeposited += amount;
        emit Bid(side, msg.sender, amount);
    }

    event MarketOutcome(Side winningSide, address indexed user, bool isWinner);
    function resolveMarket(
        bytes[] calldata priceUpdate
    ) external payable onlyOwner {
        require(currentPhase == Phase.Bidding, "Market not in bidding phase");

        uint fee = pyth.getUpdateFee(priceUpdate);
        require(msg.value >= fee, "Insufficient ETH for Pyth fee");

        pyth.updatePriceFeeds{value: fee}(priceUpdate);

        PythStructs.Price memory price = pyth.getPriceNoOlderThan(
            priceFeedId,
            60
        );
        resolveWithFulfilledData(price.price, price.publishTime);
    }

    function resolveWithFulfilledData(int64 _rate, uint _timestamp) internal {
        // Parse price from string to uint
        // uint finalPrice = parsePrice(oracleDetails.finalPrice);

        int64 finalPrice = _rate;
        uint updatedAt = _timestamp;

        resolved = true;
        currentPhase = Phase.Maturity;
        oracleDetails.finalPrice = finalPrice;
        emit MarketResolved(finalPrice, updatedAt);

        Side winningSide;
        if (finalPrice >= oracleDetails.strikePrice) {
            winningSide = Side.Long;
        } else {
            winningSide = Side.Short;
        }

        emit MarketOutcome(winningSide, address(0), true);
    }

    function claimReward() external {
        require(currentPhase == Phase.Expiry, "Market not in expiry phase");
        require(resolved, "Market is not resolved yet");
        require(!isStaked, "Funds still staked");
        require(!hasClaimed[msg.sender], "Reward already claimed");

        int finalPrice = oracleDetails.finalPrice;

        Side winningSide;
        if (finalPrice >= oracleDetails.strikePrice) {
            winningSide = Side.Long;
        } else {
            winningSide = Side.Short;
        }

        uint userDeposit;
        uint totalWinningDeposits;
        bool isWinner = false;

        if (winningSide == Side.Long) {
            userDeposit = longBids[msg.sender];
            totalWinningDeposits = positions.long;
            if (userDeposit > 0) {
                isWinner = true;
            }
        } else {
            userDeposit = shortBids[msg.sender];
            totalWinningDeposits = positions.short;
            if (userDeposit > 0) {
                isWinner = true;
            }
        }

        emit MarketOutcome(winningSide, msg.sender, isWinner);

        require(userDeposit > 0, "No deposits on winning side");

        uint reward = (userDeposit * totalDeposited) / totalWinningDeposits;
        uint fee = (reward * feePercentage) / 100;
        uint finalReward = reward - fee;

        hasClaimed[msg.sender] = true;

        require(
            playToken.transfer(msg.sender, finalReward),
            "Token transfer failed"
        );
        emit RewardClaimed(msg.sender, finalReward);
    }

    function withdraw() public onlyOwner {
        uint amount = playToken.balanceOf(address(this));
        require(amount > 0, "No balance to withdraw.");

        require(
            playToken.transfer(msg.sender, amount),
            "Token transfer failed"
        );
        emit Withdrawal(msg.sender, amount);
    }

    function startTrading() external onlyOwner {
        require(currentPhase == Phase.Starting, "Market not in starting phase");
        currentPhase = Phase.Bidding;
    }

    function expireMarket() external onlyOwner {
        require(currentPhase == Phase.Maturity, "Market not in maturity phase");
        require(resolved == true, "Market is not resolved yet");
        currentPhase = Phase.Expiry;
    }

    function parsePrice(
        string memory priceString
    ) internal pure returns (uint) {
        bytes memory priceBytes = bytes(priceString);
        uint price = 0;

        for (uint i = 0; i < priceBytes.length; i++) {
            require(
                priceBytes[i] >= 0x30 && priceBytes[i] <= 0x39,
                "Invalid price string"
            );
            price = price * 10 + (uint(uint8(priceBytes[i])) - 0x30);
        }

        return price;
    }

    function getFinalPrice() public view returns (int) {
        return oracleDetails.finalPrice;
    }

    function getPythLatestPrice(bytes[] calldata priceUpdate) public payable {
        // Submit a priceUpdate to the Pyth contract to update the on-chain price.
        // Updating the price requires paying the fee returned by getUpdateFee.
        // WARNING: These lines are required to ensure the getPriceNoOlderThan call below succeeds. If you remove them, transactions may fail with "0x19abf40e" error.
        uint fee = pyth.getUpdateFee(priceUpdate);
        pyth.updatePriceFeeds{value: fee}(priceUpdate);

        // Read the current price from a price feed if it is less than 60 seconds old.
        // Each price feed (e.g., ETH/USD) is identified by a price feed ID.
        // The complete list of feed IDs is available at https://pyth.network/developers/price-feed-ids
        PythStructs.Price memory price = pyth.getPriceNoOlderThan(
            priceFeedId,
            60
        );
    }

    // Add receive function to accept ETH
    receive() external payable {}

    // Add fallback function
    fallback() external payable {}

    event ApprovalSuccess(uint256 amount);
    event StakingSuccess(uint256 amount, uint256 sharesReceived);

    function stakePoolFunds() external payable onlyOwner {
        require(
            currentPhase == Phase.Bidding,
            "Can only stake during Bidding phase"
        );
        require(!isStaked, "Funds already staked");
        require(msg.value > 0, "Need ETH for gas fees");

        uint256 balance = playToken.balanceOf(address(this));
        require(balance > 0, "No funds to stake");

        bool approvalSuccess = playToken.approve(address(sUSDe), balance);
        require(approvalSuccess, "Approval failed");
        emit ApprovalSuccess(balance);

        uint256 sharesBefore = IERC20(address(sUSDe)).balanceOf(address(this));
        uint256 sharesReceived = sUSDe.deposit(balance, address(this));
        uint256 sharesAfter = IERC20(address(sUSDe)).balanceOf(address(this));

        require(
            sharesAfter > sharesBefore,
            "Staking failed - no shares received"
        );
        emit StakingSuccess(balance, sharesReceived);

        isStaked = true;
    }

    function initiateUnstake() external payable onlyOwner {
        require(isStaked, "Funds not staked");
        require(
            currentPhase == Phase.Maturity,
            "Can only unstake after market resolution"
        );
        require(msg.value > 0, "Need ETH for gas fees");

        uint256 sUSDeBalance = IERC20(address(sUSDe)).balanceOf(address(this));
        sUSDe.cooldownAssets(sUSDeBalance);
        stakingTimestamp = block.timestamp;
    }

    function completeUnstake() external payable onlyOwner {
        require(isStaked, "Funds not staked");
        require(stakingTimestamp > 0, "Cooldown not initiated");
        require(
            block.timestamp >= stakingTimestamp + COOLDOWN_DURATION,
            "Cooldown period not complete"
        );
        require(msg.value > 0, "Need ETH for gas fees");

        sUSDe.unstake(address(this));
        isStaked = false;
        stakingTimestamp = 0;
    }

    // Add function to withdraw excess ETH
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "ETH transfer failed");
    }

    // Add view function to check staking rewards
    function getStakingBalance() external view returns (uint256) {
        if (!isStaked) return 0;
        uint256 sUSDeBalance = IERC20(address(sUSDe)).balanceOf(address(this));
        return sUSDe.convertToAssets(sUSDeBalance);
    }

    function getStakingState()
        external
        view
        returns (bool _isStaked, uint256 playTokenBalance, uint256 sUSDeBalance)
    {
        return (
            isStaked,
            playToken.balanceOf(address(this)),
            IERC20(address(sUSDe)).balanceOf(address(this))
        );
    }

    // Add this view function to check accrued rewards
    function getAccruedRewards()
        external
        view
        returns (uint256 initialAmount, uint256 currentAmount, uint256 rewards)
    {
        require(isStaked, "No funds are staked");

        // Get current sUSDe balance
        uint256 sUSDeBalance = IERC20(address(sUSDe)).balanceOf(address(this));

        // Get current value in USDe
        uint256 currentUSDe = sUSDe.convertToAssets(sUSDeBalance);

        // Get initial amount (before rewards)
        uint256 initialUSDe = playToken.balanceOf(address(this));

        // Calculate rewards
        uint256 rewardsUSDe = currentUSDe > initialUSDe
            ? currentUSDe - initialUSDe
            : 0;

        return (initialUSDe, currentUSDe, rewardsUSDe);
    }

    function getUserSelectedSide(address user) external view returns (Side) {
        return userSelectedSide[user];
    }
}
