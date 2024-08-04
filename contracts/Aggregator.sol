/*
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "./interfaces/ITypeAndVersion.sol";
import "./interfaces/IAggregator.sol";
import "./interfaces/IAggregatorValidator.sol";


contract Aggregator is Ownable, IAggregator, ITypeAndVersion {
    struct Round {
        int256 answer;
        uint64 startedAt;
        uint64 updatedAt;
        uint32 answeredInRound;
    }

    struct RoundDetails {
        int256[] submissions;
        uint32 maxSubmissions;
        uint32 minSubmissions;
        uint32 timeout;
    }

    struct OracleStatus {
        uint32 startingRound;
        uint32 endingRound;
        uint32 lastReportedRound;
        int256 latestSubmission;
        uint16 index;
    }

    struct Requester {
        bool authorized;
        uint32 delay;
    }

    IAggregatorValidator public validator;

    uint job_id = 0;
    address payable private immutable coprocessor;


    uint32 public maxSubmissionCount;
    uint32 public minSubmissionCount;
    uint32 public restartDelay;
    uint32 public timeout;
    uint8 public override decimals;
    string public override description;

    uint256 public constant MAX_ORACLE_COUNT = 77;

    uint32 private reportingRoundId;
    uint32 internal latestRoundId;
    mapping(address => OracleStatus) private oracles;
    mapping(uint32 => Round) internal rounds;
    mapping(uint32 => RoundDetails) internal details;
    mapping(address => Requester) internal requesters;
    address[] private oracleAddresses;

    mapping(uint => string) public jobs;

    event NewJob(uint indexed job_id);
    event RoundDetailsUpdated(
        uint32 indexed minSubmissionCount,
        uint32 indexed maxSubmissionCount,
        uint32 restartDelay,
        uint32 timeout
    );
    event OraclePermissionsUpdated(address indexed oracle, bool indexed whitelisted);
    event SubmissionReceived(
        int256 indexed submission,
        uint32 indexed round,
        address indexed oracle
    );
    event RequesterPermissionsSet(address indexed requester, bool authorized, uint32 delay);
    event ValidatorUpdated(address indexed previous, address indexed current);

    constructor(
        uint32 _timeout, 
        address _validator, 
        uint8 _decimals, 
        string memory _description,
        address _coprocessor
    ) {
        updateFutureRounds(0, 0, 0, _timeout);
        setValidator(_validator);
        decimals = _decimals;
        description = _description;
        coprocessor = payable(_coprocessor);

        rounds[0].updatedAt = uint64(block.timestamp - uint256(_timeout));
    }

    function submit(uint256 _roundId, int256 _submission) external {
        bytes memory error = validateOracleRound(msg.sender, uint32(_roundId));
        require(error.length == 0, string(error));

        oracleInitializeNewRound(uint32(_roundId));
        recordSubmission(_submission, uint32(_roundId));
        (bool updated, int256 newAnswer) = updateRoundAnswer(uint32(_roundId));
        deleteRoundDetails(uint32(_roundId));
        if (updated) {
            validateAnswer(uint32(_roundId), newAnswer);
        }
    }

    function changeOracles(
        address[] calldata _removed,
        address[] calldata _added,
        uint32 _minSubmissionCount,
        uint32 _maxSubmissionCount,
        uint32 _restartDelay
    ) external onlyOwner {
        for (uint256 i = 0; i < _removed.length; i++) {
            removeOracle(_removed[i]);
        }

        if (uint256(oracleCount()) + _added.length >= MAX_ORACLE_COUNT) {
            revert TooManyOracles();
        }

        for (uint256 i = 0; i < _added.length; i++) {
            addOracle(_added[i]);
        }

        updateFutureRounds(_minSubmissionCount, _maxSubmissionCount, _restartDelay, timeout);
    }

    function updateFutureRounds(
        uint32 _minSubmissionCount,
        uint32 _maxSubmissionCount,
        uint32 _restartDelay,
        uint32 _timeout
    ) public onlyOwner {
        uint32 oracleNum = oracleCount();

        if (_minSubmissionCount > _maxSubmissionCount) {
            revert MinSubmissionGtMaxSubmission();
        }

        if (_maxSubmissionCount > oracleNum) {
            revert MaxSubmissionGtOracleNum();
        }

        if (oracleNum > 0) {
            if (oracleNum <= _restartDelay) {
                revert RestartDelayExceedOracleNum();
            }
            if (_minSubmissionCount == 0) {
                revert MinSubmissionZero();
            }
        }

        minSubmissionCount = _minSubmissionCount;
        maxSubmissionCount = _maxSubmissionCount;
        restartDelay = _restartDelay;
        timeout = _timeout;

        emit RoundDetailsUpdated(_minSubmissionCount, _maxSubmissionCount, _restartDelay, _timeout);
    }

    function oracleCount() public view returns (uint8) {
        return uint8(oracleAddresses.length);
    }

    function getOracles() external view returns (address[] memory) {
        return oracleAddresses;
    }

    function getRoundData(
        uint80 _roundId
    )
        public
        view
        virtual
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        Round memory r = rounds[uint32(_roundId)];

        if (r.answeredInRound == 0 || !validRoundId(_roundId)) {
            revert NoDataPresent();
        }

        return (_roundId, r.answer, r.startedAt, r.updatedAt, r.answeredInRound);
    }

    function latestRoundData()
        public
        view
        virtual
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return getRoundData(latestRoundId);
    }

    function requestNewRound() external returns (uint80) {
        if (!requesters[msg.sender].authorized) {
            revert RequesterNotAuthorized();
        }

        uint32 current = reportingRoundId;
        if (rounds[current].updatedAt == 0 && !timedOut(current)) {
            revert PrevRoundNotSupersedable();
        }

        uint32 newRoundId = current + 1;
        requesterInitializeNewRound(newRoundId);
        return newRoundId;
    }

    function setRequesterPermissions(
        address _requester,
        bool _authorized,
        uint32 _delay
    ) external onlyOwner {
        if (requesters[_requester].authorized == _authorized) {
            return;
        }

        if (_authorized) {
            requesters[_requester].authorized = _authorized;
            requesters[_requester].delay = _delay;
        } else {
            delete requesters[_requester];
        }

        emit RequesterPermissionsSet(_requester, _authorized, _delay);
    }

    function setValidator(address _newValidator) public onlyOwner {
        address previous = address(validator);

        if (previous != _newValidator) {
            validator = IAggregatorValidator(_newValidator);
            emit ValidatorUpdated(previous, _newValidator);
        }
    }

    function typeAndVersion() external pure virtual override returns (string memory) {
        return "Aggregator v0.1";
    }

    function addOracle(address _oracle) private {
        if (oracleEnabled(_oracle)) {
            revert OracleAlreadyEnabled();
        }
        oracles[_oracle].startingRound = getStartingRound(_oracle);
        oracles[_oracle].endingRound = ROUND_MAX;
        oracles[_oracle].index = uint16(oracleAddresses.length);
        oracleAddresses.push(_oracle);

        emit OraclePermissionsUpdated(_oracle, true);
    }

    function removeOracle(address _oracle) private {
        if (!oracleEnabled(_oracle)) {
            revert OracleNotEnabled();
        }
        oracles[_oracle].endingRound = reportingRoundId + 1;
        address tail = oracleAddresses[uint256(oracleCount()) - 1];
        uint16 index = oracles[_oracle].index;
        oracles[tail].index = index;
        delete oracles[_oracle].index;
        oracleAddresses[index] = tail;
        oracleAddresses.pop();

        emit OraclePermissionsUpdated(_oracle, false);
    }

    function oracleInitializeNewRound(uint32 _roundId) private {
        if (!newRound(_roundId)) {
            return;
        }
        uint256 lastStarted = oracles[msg.sender].lastReportedRound;
        if (lastStarted > 0 && _roundId <= lastStarted + restartDelay) {
            return;
        }

        initializeNewRound(_roundId);
        oracles[msg.sender].lastReportedRound = _roundId;
    }

    function requesterInitializeNewRound(uint32 _roundId) private {
        if (!newRound(_roundId)) {
            return;
        }
        uint256 lastStarted = requesters[msg.sender].delay;
        if (lastStarted > 0 && _roundId <= lastStarted) {
            revert NewRequestTooSoon();
        }

        initializeNewRound(_roundId);
        requesters[msg.sender].delay = _roundId;
    }

    function initializeNewRound(uint32 _roundId) private {
        reportingRoundId = _roundId;
        RoundDetails memory nextDetails = RoundDetails(
            new int256 ,
            maxSubmissionCount,
            minSubmissionCount,
            timeout
        );
        details[_roundId] = nextDetails;
        rounds[_roundId].startedAt = uint64(block.timestamp);

        emit NewRound(_roundId, msg.sender, rounds[_roundId].startedAt);
    }

    function recordSubmission(int256 _submission, uint32 _roundId) private {
        if (!acceptingSubmissions(_roundId)) {
            revert RoundNotAcceptingSubmission();
        }

        details[_roundId].submissions.push(_submission);
        oracles[msg.sender].lastReportedRound = _roundId;
        oracles[msg.sender].latestSubmission = _submission;

        emit SubmissionReceived(_submission, _roundId, msg.sender);
    }

    function deleteRoundDetails(uint32 _roundId) private {
        if (details[_roundId].submissions.length >= details[_roundId].maxSubmissions) {
            delete details[_roundId];
        }
    }

    function updateRoundAnswer(uint32 _roundId) internal returns (bool, int256) {
        if (details[_roundId].submissions.length < details[_roundId].minSubmissions) {
            return (false, 0);
        }

        int256 newAnswer = Median.calculateInplace(details[_roundId].submissions);
        rounds[_roundId].answer = newAnswer;
        rounds[_roundId].updatedAt = uint64(block.timestamp);
        rounds[_roundId].answeredInRound = _roundId;
        latestRoundId = _roundId;

        emit AnswerUpdated(newAnswer, _roundId, block.timestamp);

        return (true, newAnswer);
    }

    function validateAnswer(uint32 _roundId, int256 _newAnswer) private {
        IAggregatorValidator av = validator;
        if (address(av) == address(0)) {
            return;
        }

        uint32 prevRound = _roundId - 1;
        uint32 prevAnswerRoundId = rounds[prevRound].answeredInRound;
        int256 prevRoundAnswer = rounds[prevRound].answer;
        try av.validate{gas: 100000}(prevAnswerRoundId, prevRoundAnswer, _roundId, _newAnswer) {} catch {}
    }

    function acceptingSubmissions(uint32 _roundId) private view returns (bool) {
        return details[_roundId].maxSubmissions != 0;
    }

    function validateOracleRound(address _oracle, uint32 _roundId) private view returns (bytes memory) {
        uint32 startingRound = oracles[_oracle].startingRound;
        uint32 rrId = reportingRoundId;

        if (startingRound == 0) return "not enabled oracle";
        if (startingRound > _roundId) return "not yet enabled oracle";
        if (oracles[_oracle].endingRound < _roundId) return "no longer allowed oracle";
        if (oracles[_oracle].lastReportedRound >= _roundId)
            return "cannot report on previous rounds";
        if (_roundId != rrId && _roundId != rrId + 1 && !previousAndCurrentUnanswered(_roundId, rrId))
            return "invalid round to report";
        if (_roundId != 1 && !supersedable(_roundId - 1)) return "previous round not supersedable";

        return "";
    }

    function supersedable(uint32 _roundId) private view returns (bool) {
        return rounds[_roundId].updatedAt > 0;
    }

    function oracleEnabled(address _oracle) private view returns (bool) {
        return oracles[_oracle].endingRound == ROUND_MAX;
    }

    function validRoundId(uint256 _roundId) private pure returns (bool) {
        return _roundId <= type(uint32).max;
    }

    function previousAndCurrentUnanswered(uint32 _roundId, uint32 _rrId) private view returns (bool) {
        return _roundId + 1 == _rrId && rounds[_rrId].updatedAt == 0;
    }

    function newRound(uint32 _roundId) private view returns (bool) {
        return _roundId == reportingRoundId + 1;
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

    function getResult(uint _job_id) public view returns (string memory) {
        return jobs[_job_id];
    }

    function callback(string calldata _result, uint256 _job_id) public {
        require(
            msg.sender == coprocessor,
            "Only the coprocessor can call this function"
        );
        jobs[_job_id] = _result;
    }
}
*/