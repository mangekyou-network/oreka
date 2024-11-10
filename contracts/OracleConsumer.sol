// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.16;

interface ChainlinkStyleInterface {
    function decimals() external view returns (uint8);

    function description() external view returns (string memory);

    function version() external view returns (uint256);

    function getRoundData(uint80 _roundId)
        external
        view
        returns (uint80 roundId, string memory answer, uint256 updatedAt, uint80 answeredInRound);

    function latestRoundData()
        external
        view
        returns (uint80 roundId, string memory answer, uint256 updatedAt, uint80 answeredInRound);

    event AnswerUpdated(string indexed pairId, int256 answer, uint256 rate, uint256 decimals, uint256 timestamp);
}

contract OracleConsumer is ChainlinkStyleInterface {
    uint8 public decimals;
    string public description;
    uint256 public version;
    uint80 public currentRoundId;

    uint job_id = 0;
    address payable private immutable coprocessor;

    mapping(uint80 => Round) public rounds;
    // mapping(uint => string) public jobs;

    event NewJob(uint indexed job_id);

    struct Round {
        string answer;
        // uint256 startedAt;
        uint256 updatedAt;
    }

    constructor(address _coprocessor)
    {
        decimals = 9;
        // description = _description;
        // version = _version;
        coprocessor = payable(_coprocessor);
    }

    function getRoundData(uint80 _roundId)
        external
        view
        returns (uint80 roundId, string memory answer, uint256 updatedAt, uint80 answeredInRound)
    {
        return (_roundId, rounds[_roundId].answer, rounds[_roundId].updatedAt, _roundId);
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, string memory answer, uint256 updatedAt, uint80 answeredInRound)
    {
        uint80 round = currentRoundId - 1;
        return (round, rounds[round].answer, rounds[round].updatedAt, round);
    }
    

    function newJob() public payable {
        // Require at least 0.01 ETH to be sent with the call
        require(msg.value >= 0.01 ether, "Minimum 0.01 ETH not met");

        // Forward the ETH received to the coprocessor address
        // to pay for the submission of the job result back to the EVM
        // contract.
        coprocessor.transfer(msg.value);

        // Emit the new job event
        emit NewJob(job_id);

        // Increment job counter
        job_id++;
    }

    function getResult() public view returns (string memory) {
        uint80 round = currentRoundId - 1;
        return rounds[round].answer;
    }

    function callback(string calldata _result) public {
        require(
            msg.sender == coprocessor,
            "Only the coprocessor can call this function"
        );
        // jobs[_job_id] = _result;
        rounds[currentRoundId].answer = _result;
        rounds[currentRoundId].updatedAt = block.timestamp;
        unchecked {
            currentRoundId++;
        }
    }
}