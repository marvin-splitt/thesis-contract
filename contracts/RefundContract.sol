// SPDX-License-Identifier: SEE LICENSE IN LICENSE
import "hardhat/console.sol";

pragma solidity ^0.8.17;

contract RefundContract {
    address public owner;
    uint private orderCounter;
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
        uint orderId;
        address customer;
        uint amount;
        Status status;
        string externalOrderNumber;
    }

    mapping(uint => Order) private orders;

    // event to be emitted when an order is created
    event OrderCreated(
        uint orderId,
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
        orderCounter++;
        orders[orderCounter] = Order(
            orderCounter,
            customer,
            amount,
            Status.CREATED,
            ""
        );
        emit OrderCreated(orderCounter, customer, amount, Status.CREATED);
    }

    function getOrder(
        uint orderId
    ) public view onlyOwner returns (Order memory) {
        return orders[orderId];
    }

    function markOrderAsShipped(uint orderId) public {
        require(
            isDeliveryPartner(msg.sender),
            "Only delivery partners can call this function"
        );
        Order storage order = orders[orderId];
        require(
            order.status == Status.PAID,
            "Order must be marked as paid to be shipped"
        );
        order.status = Status.SHIPPED;
        orders[orderId] = order;
    }
}
