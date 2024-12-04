// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../contracts/OracleConsumer.sol";
import "../contracts/BinaryOptionMarketPyth.sol";

contract MyScript is Script {
    function run() external {
        // the private key of the deployer is the first private key printed by running anvil

        address ownerPublicKey = 0xAb251237210f6C2f7fAd53bE182E8bFdE2F628e0;
        // we use that key to broadcast all following transactions
        vm.startBroadcast(vm.envUint("EVM_PRIVATE_KEY"));

        // this creates the contract. it will have the same address every time if we use a
        // new instance of anvil for every deployment.

        // OracleConsumer coprocessor = new OracleConsumer(
        //     chain_fusion_canister_address
        // );

        // we create 1 job
        // for (uint256 index = 0; index < 1; index++) {
        //     coprocessor.newJob{value: 0.1 ether}();
        // }

        // Sepolia SNX/USD feed address: 0xc0F82A46033b8BdBA4Bb0B0e28Bc2006F64355bC

        // demo example: define strikePrice for WIF/USD pair at 1.66USD and owner will call the resolveMarket() around August 13th 2024.
        new BinaryOptionMarket(
            ownerPublicKey,
            0xDd24F84d36BF92C65F92307595335bdFab5Bbd21, // Ethena Pyth contract address
            0x4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc, // WIF/USD pair
            300000000,
            0xf805ce4F96e0EdD6f0b6cd4be22B34b92373d696, // USDe token
            0x1B6877c6Dac4b6De4c5817925DC40E2BfdAFc01b // sUSDe token
        );
        vm.stopBroadcast();
    }
}
