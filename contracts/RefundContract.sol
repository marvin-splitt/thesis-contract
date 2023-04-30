// SPDX-License-Identifier: SEE LICENSE IN LICENSE
import "hardhat/console.sol";

pragma solidity ^0.8.17;

// DAI contract interface
interface DaiContract {
    function approve(address guy, uint wad) external returns (bool);

    function transfer(address dst, uint wad) external returns (bool);

    function transferFrom(
        address src,
        address dst,
        uint wad
    ) external returns (bool);
}

contract RefundContract {
    DaiContract public daiContract;
    address public owner;
    uint public refundDuration;
    uint private _orderCounter;
    // array of delivery partner addresses
    address[] private _deliveryPartners;

    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    modifier onlyDeliveryPartner() {
        require(
            isDeliveryPartner(msg.sender),
            "Only delivery partners can call this function"
        );
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

    constructor(address daiContractAddress, uint refundDuration_) {
        daiContract = DaiContract(daiContractAddress);
        owner = msg.sender;
        refundDuration = refundDuration_ * 1 days;
    }

    // struct to store order details
    struct Order {
        uint orderId;
        address customer;
        uint amount;
        Status status;
        string externalOrderNumber;
        uint createdAt;
        uint returnedAt;
        uint refundedAt;
    }

    mapping(uint => Order) private orders;

    // event to be emitted when a delivery partner is added
    event DeliveryPartnerAdded(address deliveryPartner);

    // event to be emitted when an order is created
    event OrderCreated(
        uint orderId,
        address customer,
        uint amount,
        Status status
    );

    event OrderPaid(uint orderId, address customer, uint amount, Status status);

    event OrderShipped(
        uint orderId,
        address customer,
        address deliveryPartner,
        Status status
    );

    event OrderDelivered(
        uint orderId,
        address customer,
        address deliveryPartner,
        Status status
    );

    event OrderReturned(
        uint orderId,
        address customer,
        address deliveryPartner,
        Status status
    );

    event OrderRefunded(
        uint orderId,
        address customer,
        uint amount,
        Status status
    );

    // DAI Contract transferFrom wrapper
    function payOrder(uint wad, uint orderId) public returns (bool) {
        require(wad > 0, "Amount must be greater than 0");
        require(orderId > 0, "Order ID must be greater than 0");
        require(orders[orderId].customer != address(0), "Order does not exist");
        require(
            orders[orderId].customer == msg.sender,
            "Only the customer can pay for the order"
        );
        require(
            orders[orderId].status == Status.CREATED,
            "Order must be marked as unpaid to be paid"
        );
        require(
            wad == orders[orderId].amount,
            "Payment amount must match order amount"
        );
        daiContract.transferFrom(msg.sender, address(this), wad);
        orders[orderId].status = Status.PAID;
        emit OrderPaid(orderId, msg.sender, wad, Status.PAID);
        return true;
    }

    function addDeliveryPartner(address deliveryPartner) public onlyOwner {
        _deliveryPartners.push(deliveryPartner);
        emit DeliveryPartnerAdded(deliveryPartner);
    }

    function isDeliveryPartner(
        address deliveryPartner
    ) public view returns (bool) {
        for (uint i = 0; i < _deliveryPartners.length; i++) {
            if (_deliveryPartners[i] == deliveryPartner) {
                return true;
            }
        }
        return false;
    }

    function createOrder(
        address customer,
        uint amount,
        string memory orderNumber
    ) public onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        _orderCounter++;
        orders[_orderCounter] = Order(
            _orderCounter,
            customer,
            amount,
            Status.CREATED,
            orderNumber,
            block.timestamp,
            0,
            0
        );
        emit OrderCreated(_orderCounter, customer, amount, Status.CREATED);
    }

    function getOrder(
        uint orderId
    ) public view onlyOwner returns (Order memory) {
        return orders[orderId];
    }

    function markOrderAsShipped(uint orderId) public onlyDeliveryPartner {
        Order storage order = orders[orderId];
        require(order.customer != address(0), "Order does not exist");
        require(
            order.status == Status.PAID,
            "Order must be marked as paid to be shipped"
        );
        order.status = Status.SHIPPED;
        orders[orderId] = order;
        emit OrderShipped(orderId, order.customer, msg.sender, Status.SHIPPED);
    }

    function markOrderAsDelivered(uint orderId) public onlyDeliveryPartner {
        Order storage order = orders[orderId];
        require(
            order.status == Status.SHIPPED,
            "Order must be marked as shipped to be delivered"
        );
        order.status = Status.DELIVERED;
        orders[orderId] = order;
    }

    function markOrderAsReturned(uint orderId) public onlyDeliveryPartner {
        Order storage order = orders[orderId];
        require(order.customer != address(0), "Order does not exist");
        require(
            order.status == Status.DELIVERED,
            "Order must be marked as delivered to be returned"
        );
        require(
            block.timestamp - order.createdAt <= refundDuration,
            "Order refund period has expired"
        );
        order.status = Status.RETURNED;
        order.returnedAt = block.timestamp;
        orders[orderId] = order;
        emit OrderReturned(
            orderId,
            order.customer,
            msg.sender,
            Status.RETURNED
        );
    }

    function refundOrder(uint orderId) public {
        Order storage order = orders[orderId];
        require(
            order.status == Status.RETURNED,
            "Order must be marked as returned to be refunded"
        );
        require(
            msg.sender == order.customer,
            "Only the customer can refund the order"
        );
        daiContract.transfer(order.customer, order.amount);
        order.status = Status.REFUNDED;
        order.refundedAt = block.timestamp;
        orders[orderId] = order;
    }
}
