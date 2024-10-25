// price feed contract which Pythia regularly updates by Sybil price feed

import {OrallyPythiaConsumer} from "@orally-network/solidity-sdk/OrallyPythiaConsumer.sol";

interface IFxPriceFeedExample {
    function pair() external view returns (string memory);

    function baseTokenAddr() external view returns (address);

    function decimalPlaces() external view returns (uint256);
}

contract FxPriceFeedExample is OrallyPythiaConsumer, IFxPriceFeedExample {
    uint256 public rate;
    uint256 public lastUpdate;
    string public pair;
    address public baseTokenAddr;
    uint256 public decimalPlaces;

    constructor(
        address _pythiaRegistry,
        string memory _pair,
        address _baseTokenAddr,
        uint256 _decimalPlaces,
        address _owner
    ) OrallyPythiaConsumer(_pythiaRegistry, _owner) {
        pair = _pair;
        baseTokenAddr = _baseTokenAddr;
        decimalPlaces = _decimalPlaces;
    }

    function updateRate(
        string memory _pairId,
        uint256 _rate,
        uint256 _decimals,
        uint256 _timestamp
    ) external onlyExecutor(workflowId) {
        rate = (_rate * (10 ** decimalPlaces)) / (10 ** _decimals); // normalise rate
        lastUpdate = _timestamp;
    }

    function updateTime() external view returns (uint256) {
        return lastUpdate;
    }

    function exchangeRate() external view returns (uint256) {
        return rate;
    }
}
