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

    enum Status {
        CREATED,
        PAID,
        SHIPPED,
        DELIVERED,
        RETURNED,
        REFUNDED
    }

    constructor() {
        owner = msg.sender;
    }

    // struct to store order details
    struct Order {
        bytes32 orderId;
        address customer;
        uint amount;
        Status status;
        string externalOrderNumber;
    }

    mapping(bytes32 => Order) private orders;

    // event to be emitted when an order is created
    event OrderCreated(
        bytes32 orderId,
        address customer,
        uint amount,
        Status status
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

    function createOrder(address customer, uint amount) public onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        bytes32 orderId = UniqueId.getUniqueId();
        orders[orderId] = Order(orderId, customer, amount, Status.CREATED, "");
        emit OrderCreated(orderId, customer, amount, Status.CREATED);
    }

    function getOrder(
        bytes32 orderId
    ) public view onlyOwner returns (Order memory) {
        return orders[orderId];
    }
}
