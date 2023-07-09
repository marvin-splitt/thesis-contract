// SPDX-License-Identifier: SEE LICENSE IN LICENSE
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// DEV Dependencies, remove for production
import "hardhat/console.sol";

pragma solidity ^0.8.17;

contract RefundContract {
    // address of the ERC20 token contract used for payments
    IERC20 public erc20Contract;
    // address of the owner of the contract, in this case the merchant
    address public owner;
    // duration in days for the refund period
    uint public refundDuration;
    // counter to keep track of the order ids
    uint private _orderCounter;
    // array of delivery partner addresses
    address[] public deliveryPartners;
    // amount of DAI the owner is able to withdraw
    uint private _ownerBalance;

    // modifier to check if the caller is the owner of the contract
    // if not, the function will throw an error and revert
    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    // modifier to check if the caller is a delivery partner
    // if not, the function will throw an error and revert
    modifier onlyDeliveryPartner() {
        require(
            isDeliveryPartner(msg.sender),
            "Only delivery partners can call this function"
        );
        _;
    }

    // enum to keep track of the order status
    // depending on the status, different functions can be called
    enum Status {
        CREATED,
        PAID,
        SHIPPED,
        DELIVERED,
        RETURNED,
        REFUNDED,
        CLOSED
    }

    // constructor to initialize the contract
    // here we pass the address of the ERC20 token contract
    // and the duration of the refund period in days
    // the owner of the contract is set to the address which deploys the contract
    constructor(address erc20ContractAddress, uint refundDuration_) {
        erc20Contract = IERC20(erc20ContractAddress);
        owner = msg.sender;
        refundDuration = refundDuration_ * 1 days;
    }

    // struct to store order details
    struct Order {
        uint orderId;
        address customer;
        uint amount;
        Status status;
        uint externalOrderNumber;
        uint createdAt;
        uint returnedAt;
        uint refundedAt;
        uint closedAt;
    }

    // mapping to store orders
    // key is the order id
    // value is the order struct
    mapping(uint => Order) private orders;
    // mapping to store open orders
    // key is the external order number
    // value is the order id
    mapping(uint => uint) private openOrders;

    // event to be emitted when a delivery partner is added
    event DeliveryPartnerAdded(address deliveryPartner);

    // event to be emitted when an order is created
    event OrderCreated(
        uint orderId,
        address customer,
        uint amount,
        Status status,
        uint externalOrderNumber
    );

    event OrderPaid(
        uint orderId,
        address customer,
        uint amount,
        Status status,
        uint externalOrderNumber
    );

    event OrderShipped(
        uint orderId,
        address customer,
        address deliveryPartner,
        Status status,
        uint externalOrderNumber
    );

    event OrderDelivered(
        uint orderId,
        address customer,
        address deliveryPartner,
        Status status,
        uint externalOrderNumber
    );

    event OrderReturned(
        uint orderId,
        address customer,
        address deliveryPartner,
        Status status,
        uint externalOrderNumber
    );

    event OrderRefunded(
        uint orderId,
        address customer,
        uint amount,
        Status status,
        uint externalOrderNumber
    );

    event OrderClosed(
        uint orderId,
        address customer,
        Status status,
        uint externalOrderNumber
    );

    event OwnerBalanceWithdrawn(address owner, uint amount);

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
        erc20Contract.transferFrom(msg.sender, address(this), wad);
        orders[orderId].status = Status.PAID;
        emit OrderPaid(
            orderId,
            msg.sender,
            wad,
            Status.PAID,
            orders[orderId].externalOrderNumber
        );
        return true;
    }

    function addDeliveryPartner(address deliveryPartner) public onlyOwner {
        deliveryPartners.push(deliveryPartner);
        emit DeliveryPartnerAdded(deliveryPartner);
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

    function createOrder(
        address customer,
        uint amount,
        uint orderNumber
    ) public onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        _orderCounter++;
        Order memory newOrder = Order(
            _orderCounter,
            customer,
            amount,
            Status.CREATED,
            orderNumber,
            block.timestamp,
            0,
            0,
            0
        );
        orders[_orderCounter] = newOrder;
        openOrders[orderNumber] = _orderCounter;
        emit OrderCreated(
            _orderCounter,
            customer,
            amount,
            Status.CREATED,
            orderNumber
        );
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
        emit OrderShipped(
            orderId,
            order.customer,
            msg.sender,
            Status.SHIPPED,
            order.externalOrderNumber
        );
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

        if (order.status == Status.RETURNED) {
            revert("Order has already been returned");
        }

        require(
            order.status == Status.DELIVERED,
            "Order must be marked as delivered to be returned"
        );
        require(
            block.timestamp - order.createdAt <= refundDuration,
            "Order refund period has expired"
        );
        require(order.closedAt == 0, "Order has already been closed");
        order.status = Status.RETURNED;
        order.returnedAt = block.timestamp;
        orders[orderId] = order;
        emit OrderReturned(
            orderId,
            order.customer,
            msg.sender,
            Status.RETURNED,
            order.externalOrderNumber
        );
    }

    function refundOrder(uint orderNumber) public {
        console.log("refundOrder", orderNumber);
        uint orderId = openOrders[orderNumber];
        console.log("orderId", orderId);
        require(
            orderId > 0,
            "Order does not exist or has already been refunded"
        );
        Order storage order = orders[orderId];
        require(order.customer != address(0), "Order does not exist");
        if (order.status == Status.REFUNDED) {
            revert("Order has already been refunded");
        }
        require(
            order.status == Status.RETURNED || order.status == Status.PAID,
            "Order must be marked as returned or paid to be refunded"
        );

        require(
            msg.sender == order.customer,
            "Orders can only be refunded by the customer"
        );
        require(
            block.timestamp - order.returnedAt <= refundDuration,
            "Order refund period has expired"
        );
        require(order.closedAt == 0, "Order has already been closed");
        // FIXME: This is potentially a re-entrancy vulnerability
        erc20Contract.transfer(order.customer, order.amount);
        order.status = Status.REFUNDED;
        order.refundedAt = block.timestamp;
        orders[orderId] = order;
        openOrders[orderNumber] = 0;
        emit OrderRefunded(
            orderId,
            order.customer,
            order.amount,
            Status.REFUNDED,
            order.externalOrderNumber
        );
    }

    function updateOwnersBalance(uint orderNumber) public onlyOwner {
        uint orderId = openOrders[orderNumber];
        require(orderId > 0, "Order does not exist");
        Order memory order = orders[orderId];
        require(order.customer != address(0), "Order does not exist");
        require(
            order.status == Status.DELIVERED,
            "Order must be marked as delivered to update owner's balance"
        );
        require(
            order.refundedAt == 0,
            "Order must not have been refunded to update owner's balance"
        );
        require(
            order.returnedAt == 0,
            "Order must not have been returned to update owner's balance"
        );
        require(order.closedAt == 0, "Order has already been closed");
        require(
            order.createdAt + refundDuration < block.timestamp,
            "Order refund period has not expired"
        );
        _ownerBalance += order.amount;
        orders[orderId].closedAt = block.timestamp;
        openOrders[orderNumber] = 0;
        emit OrderClosed(
            orderId,
            order.customer,
            Status.CLOSED,
            order.externalOrderNumber
        );
    }

    function getOwnersBalance() public view onlyOwner returns (uint) {
        return _ownerBalance;
    }

    function withdrawOwnerBalance() public onlyOwner {
        console.log("withdrawOwnerBalance", _ownerBalance);
        console.log("contract balance", erc20Contract.balanceOf(address(this)));
        require(_ownerBalance > 0, "Owner balance must be greater than 0");
        require(
            erc20Contract.balanceOf(address(this)) >= _ownerBalance,
            "Contract balance must be greater than owner balance"
        );
        console.log("transfering");
        uint amount = _ownerBalance;
        _ownerBalance = 0;
        erc20Contract.transfer(owner, amount);
        emit OwnerBalanceWithdrawn(owner, amount);
    }
}
