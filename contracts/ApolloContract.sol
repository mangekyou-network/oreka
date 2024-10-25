// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ApolloReceiver} from "@orally-network/solidity-sdk/ApolloReceiver.sol";

contract RequestingPriceFeedExample is ApolloReceiver {
    constructor(
        address _executorsRegistry,
        address _apolloCoordinator
    ) ApolloReceiver(_executorsRegistry, _apolloCoordinator) {}

    // Example function to request a price feed
    // `apolloCoordinator` is passing as public var from ApolloReceiver contract
    function requestPriceFeed() public {
        // Requesting the ARB/UNI price feed with a specified callback gas limit
        uint256 requestId = apolloCoordinator.requestDataFeed(
            "ARB/UNI",
            100000
        );
    }

    // Overriding the fulfillData function to handle incoming data
    function fulfillData(bytes memory data) internal override {
        (
            uint256 _requestId,
            string memory _dataFeedId,
            uint256 _rate,
            uint256 _decimals,
            uint256 _timestamp
        ) = abi.decode(data, (uint256, string, uint256, uint256, uint256));

        // ...
    }
}

contract RequestingRandomnessExample is ApolloReceiver {
    constructor(
        address _executorsRegistry,
        address _apolloCoordinator
    ) ApolloReceiver(_executorsRegistry, _apolloCoordinator) {}

    // Example function to request a price feed
    // `apolloCoordinator` is passing as public var from ApolloReceiver contract
    function requestRandomness() public {
        // Requesting the randomness with a specified callback gas limit and number of random words
        apolloCoordinator.requestRandomFeed(300000, 1);
    }

    // Overriding the fulfillData function to handle incoming data
    function fulfillData(bytes memory data) internal override {
        (, uint256[] memory randomWords) = abi.decode(
            data,
            (uint256, uint256[])
        );

        // transform the result to a number between 1 and 100 inclusively
        uint256 randomNumber = (randomWords[0] % 100) + 1;

        // ...
    }
}
