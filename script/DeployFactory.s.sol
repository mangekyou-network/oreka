// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";  // Thư viện Script của Foundry
import "../contracts/Factory.sol";  // Import hợp đồng Factory từ thư mục contracts

contract DeployFactory is Script {
    function run() external {
        // Bắt đầu phát sóng giao dịch
        vm.startBroadcast();

        // Triển khai hợp đồng Factory
        Factory factory = new Factory();

        // In ra địa chỉ của hợp đồng Factory đã triển khai
        console.log("Factory deployed to:", address(factory));

        // Kết thúc phát sóng giao dịch
        vm.stopBroadcast();
    }
}
