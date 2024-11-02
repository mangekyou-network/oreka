// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Factory {
    event Deployed(address indexed owner, address indexed contractAddress, uint index);

    // Mapping để lưu trữ địa chỉ hợp đồng theo địa chỉ owner
    mapping(address => address[]) public ownerContracts;

    function deploy(bytes32 salt, bytes memory bytecode) public {
        address addr;
        assembly {
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        require(addr != address(0), "Deployment failed");


        // Lưu địa chỉ hợp đồng vào mapping với chỉ mục
        ownerContracts[msg.sender].push(addr);
        
        // Phát sự kiện khi deploy thành công
        emit Deployed(msg.sender, addr, ownerContracts[msg.sender].length - 1);

    }

    // Hàm để lấy danh sách hợp đồng của một owner
    function getContractsByOwner(address owner) public view returns (address[] memory) {
        return ownerContracts[owner];
    }
      // Hàm tính toán địa chỉ mà hợp đồng sẽ được triển khai
    function getAddress(bytes32 salt, bytes memory bytecode) public view returns (address) {
        return address(uint160(uint(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            keccak256(bytecode)
        )))));
    }
}
