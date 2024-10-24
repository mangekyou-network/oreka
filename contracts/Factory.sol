// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Factory {
    event Deployed(address owner, address addr, bytes32 salt);

     // Mapping để lưu trữ địa chỉ hợp đồng theo địa chỉ owner
    mapping(address => address[]) public ownerContracts;

    function deploy(bytes32 salt, bytes memory bytecode) public {
        address addr;
        assembly {
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        require(addr != address(0), "Deployment failed");
        // Lưu địa chỉ hợp đồng vào mapping
        ownerContracts[msg.sender].push(addr);
        
        emit Deployed(msg.sender, addr, salt);
        // Log địa chỉ hợp đồng
        console.log("Contract deployed at:", addr);
    }

   // Hàm để lấy danh sách hợp đồng của một owner
    function getContractsByOwner(address owner) public view returns (address[] memory) {
        return ownerContracts[owner];
    }

    function getAddress(bytes32 salt, bytes memory bytecode) public view returns (address) {
        return address(uint160(uint(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            keccak256(bytecode)
        )))));
    }
}