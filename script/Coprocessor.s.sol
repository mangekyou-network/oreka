// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../contracts/OracleConsumer.sol";
import "../contracts/BinaryOptionMarket.sol";

contract MyScript is Script {
    function run(address chain_fusion_canister_address) external {
        // the private key of the deployer is the first private key printed by running anvil
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        //address ownerPublicKey = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        // we use that key to broadcast all following transactions
        vm.startBroadcast(deployerPrivateKey);

        // this creates the contract. it will have the same address every time if we use a 
        // new instance of anvil for every deployment.

        OracleConsumer coprocessor = new OracleConsumer(chain_fusion_canister_address);

       // we create 1 job
        for (uint256 index = 0; index < 1; index++) {
            coprocessor.newJob{value: 0.1 ether}();
        }

        // demo example: define strikePrice for WIF/USD pair at 1.66USD and owner will call the resolveMarket() around August 13th 2024.
        //BinaryOptionMarket binaryOptionMarket = new BinaryOptionMarket(ownerPublicKey, 166000);

        vm.stopBroadcast();
    }
}
