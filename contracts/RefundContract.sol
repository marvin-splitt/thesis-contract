// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

contract RefundContract {
    address public owner;
    // array of delivery partner addresses
    address[] private deliveryPartners;

    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addDeliveryPartner(address _deliveryPartner) public onlyOwner {
        deliveryPartners.push(_deliveryPartner);
    }
}
