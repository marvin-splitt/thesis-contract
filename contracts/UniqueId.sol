// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

library UniqueId {
    function getUniqueId() public view returns (bytes32) {
        return keccak256(abi.encode(msg.sender, block.timestamp));
    }
}
