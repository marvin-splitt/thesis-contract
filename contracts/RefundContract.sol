// SPDX-License-Identifier: SEE LICENSE IN LICENSE
import "./UniqueId.sol";
import "hardhat/console.sol";

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

    // event to be emitted when a transaction is created
    event TransactionCreated(
        bytes32 transactionId,
        address customer,
        uint amount
    );

    function addDeliveryPartner(address deliveryPartner) public onlyOwner {
        deliveryPartners.push(deliveryPartner);
    }

    function isDeliveryPartner(
        address deliveryPartner
    ) public view returns (bool) {
        for (uint i = 0; i < deliveryPartners.length; i++) {
            if (deliveryPartners[i] == deliveryPartner) {
                return true;
            }
        }
        return false;
    }

    function createTransaction(address customer, uint amount) public onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        bytes32 transactionId = UniqueId.getUniqueId();
        emit TransactionCreated(transactionId, customer, amount);
    }
}
