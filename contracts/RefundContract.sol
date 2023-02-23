// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

contract RefundContract {
    address public owner;

    constructor() {
        owner = msg.sender;
    }
}
