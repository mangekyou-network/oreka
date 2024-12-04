// test/FactoryTest.t.sol
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/Factory.sol";
import "../contracts/BinaryOptionMarketPyth.sol";
contract FactoryTest is Test {
    Factory public factory;

    function setUp() public {
        // Khởi tạo hợp đồng Factory trước mỗi kiểm thử
        factory = new Factory();
    }

    function testDeployment() public {
        // Chuẩn bị bytecode cho BinaryOptionMarket với constructor
        address owner = address(this);
        address fakeAddress = address(this);
        uint strikePrice = 1000;

        // Mã hóa bytecode với các tham số constructor
        bytes memory bytecode = abi.encodePacked(
            type(BinaryOptionMarket).creationCode,
            abi.encode(owner, fakeAddress, fakeAddress, strikePrice)
        );

        bytes32 salt = keccak256(abi.encodePacked(owner, block.timestamp));

        // Gọi deploy và kiểm tra không gặp lỗi
        vm.deal(address(this), 1 ether); // Cung cấp đủ ETH cho việc triển khai
        factory.deploy(salt, bytecode);

        // Kiểm tra địa chỉ hợp đồng đã triển khai
        address deployedAddress = factory.getAddress(salt, bytecode);
        assertTrue(deployedAddress != address(0));
    }
}
