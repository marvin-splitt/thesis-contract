Summary

- [unchecked-transfer](#unchecked-transfer) (3 results) (High)
- [incorrect-equality](#incorrect-equality) (2 results) (Medium)
- [reentrancy-no-eth](#reentrancy-no-eth) (2 results) (Medium)
- [reentrancy-events](#reentrancy-events) (3 results) (Low)
- [timestamp](#timestamp) (4 results) (Low)
- [assembly](#assembly) (2 results) (Informational)
- [pragma](#pragma) (1 results) (Informational)
- [solc-version](#solc-version) (4 results) (Informational)
- [naming-convention](#naming-convention) (1 results) (Informational)
- [cache-array-length](#cache-array-length) (1 results) (Optimization)
- [immutable-states](#immutable-states) (3 results) (Optimization)

## unchecked-transfer

Impact: High
Confidence: Medium

- [ ] ID-0
      [RefundContract.payOrder(uint256,uint256)](contracts/RefundContract.sol#L156-L183) ignores return value by [erc20Contract.transferFrom(msg.sender,address(this),wad)](contracts/RefundContract.sol#L173)

contracts/RefundContract.sol#L156-L183

- [ ] ID-1
      [RefundContract.refundOrder(uint256)](contracts/RefundContract.sol#L305-L345) ignores return value by [erc20Contract.transfer(order.customer,order.amount)](contracts/RefundContract.sol#L333)

contracts/RefundContract.sol#L305-L345

- [ ] ID-2
      [RefundContract.withdrawOwnerBalance()](contracts/RefundContract.sol#L392-L401) ignores return value by [erc20Contract.transfer(owner,amount)](contracts/RefundContract.sol#L399)

contracts/RefundContract.sol#L392-L401

## incorrect-equality

Impact: Medium
Confidence: High

- [ ] ID-3
      [RefundContract.payOrder(uint256,uint256)](contracts/RefundContract.sol#L156-L183) uses a dangerous strict equality: - [require(bool,string)(wad == orders[orderId].amount,Payment amount must match order amount)](contracts/RefundContract.sol#L168-L171)

contracts/RefundContract.sol#L156-L183

- [ ] ID-4
      [RefundContract.payOrder(uint256,uint256)](contracts/RefundContract.sol#L156-L183) uses a dangerous strict equality: - [require(bool,string)(orders[orderId].status == Status.CREATED,Order must be marked as unpaid to be paid)](contracts/RefundContract.sol#L164-L167)

contracts/RefundContract.sol#L156-L183

## reentrancy-no-eth

Impact: Medium
Confidence: Medium

- [ ] ID-5
      Reentrancy in [RefundContract.refundOrder(uint256)](contracts/RefundContract.sol#L305-L345):
      External calls: - [erc20Contract.transfer(order.customer,order.amount)](contracts/RefundContract.sol#L333)
      State variables written after the call(s): - [openOrders[orderNumber] = 0](contracts/RefundContract.sol#L337)
      [RefundContract.openOrders](contracts/RefundContract.sol#L81) can be used in cross function reentrancies: - [RefundContract.createOrder(address,uint256,uint256)](contracts/RefundContract.sol#L202-L229) - [RefundContract.refundOrder(uint256)](contracts/RefundContract.sol#L305-L345) - [RefundContract.updateOwnersBalance(uint256)](contracts/RefundContract.sol#L347-L385) - [order.status = Status.REFUNDED](contracts/RefundContract.sol#L334)
      [RefundContract.orders](contracts/RefundContract.sol#L77) can be used in cross function reentrancies: - [RefundContract.createOrder(address,uint256,uint256)](contracts/RefundContract.sol#L202-L229) - [RefundContract.getOrder(uint256)](contracts/RefundContract.sol#L231-L235) - [RefundContract.markOrderAsDelivered(uint256)](contracts/RefundContract.sol#L255-L271) - [RefundContract.markOrderAsReturned(uint256)](contracts/RefundContract.sol#L273-L303) - [RefundContract.markOrderAsShipped(uint256)](contracts/RefundContract.sol#L237-L253) - [RefundContract.payOrder(uint256,uint256)](contracts/RefundContract.sol#L156-L183) - [RefundContract.refundOrder(uint256)](contracts/RefundContract.sol#L305-L345) - [RefundContract.updateOwnersBalance(uint256)](contracts/RefundContract.sol#L347-L385) - [order.refundedAt = block.timestamp](contracts/RefundContract.sol#L335)
      [RefundContract.orders](contracts/RefundContract.sol#L77) can be used in cross function reentrancies: - [RefundContract.createOrder(address,uint256,uint256)](contracts/RefundContract.sol#L202-L229) - [RefundContract.getOrder(uint256)](contracts/RefundContract.sol#L231-L235) - [RefundContract.markOrderAsDelivered(uint256)](contracts/RefundContract.sol#L255-L271) - [RefundContract.markOrderAsReturned(uint256)](contracts/RefundContract.sol#L273-L303) - [RefundContract.markOrderAsShipped(uint256)](contracts/RefundContract.sol#L237-L253) - [RefundContract.payOrder(uint256,uint256)](contracts/RefundContract.sol#L156-L183) - [RefundContract.refundOrder(uint256)](contracts/RefundContract.sol#L305-L345) - [RefundContract.updateOwnersBalance(uint256)](contracts/RefundContract.sol#L347-L385) - [orders[orderId] = order](contracts/RefundContract.sol#L336)
      [RefundContract.orders](contracts/RefundContract.sol#L77) can be used in cross function reentrancies: - [RefundContract.createOrder(address,uint256,uint256)](contracts/RefundContract.sol#L202-L229) - [RefundContract.getOrder(uint256)](contracts/RefundContract.sol#L231-L235) - [RefundContract.markOrderAsDelivered(uint256)](contracts/RefundContract.sol#L255-L271) - [RefundContract.markOrderAsReturned(uint256)](contracts/RefundContract.sol#L273-L303) - [RefundContract.markOrderAsShipped(uint256)](contracts/RefundContract.sol#L237-L253) - [RefundContract.payOrder(uint256,uint256)](contracts/RefundContract.sol#L156-L183) - [RefundContract.refundOrder(uint256)](contracts/RefundContract.sol#L305-L345) - [RefundContract.updateOwnersBalance(uint256)](contracts/RefundContract.sol#L347-L385)

contracts/RefundContract.sol#L305-L345

- [ ] ID-6
      Reentrancy in [RefundContract.payOrder(uint256,uint256)](contracts/RefundContract.sol#L156-L183):
      External calls: - [erc20Contract.transferFrom(msg.sender,address(this),wad)](contracts/RefundContract.sol#L173)
      State variables written after the call(s): - [orders[orderId].status = Status.PAID](contracts/RefundContract.sol#L174)
      [RefundContract.orders](contracts/RefundContract.sol#L77) can be used in cross function reentrancies: - [RefundContract.createOrder(address,uint256,uint256)](contracts/RefundContract.sol#L202-L229) - [RefundContract.getOrder(uint256)](contracts/RefundContract.sol#L231-L235) - [RefundContract.markOrderAsDelivered(uint256)](contracts/RefundContract.sol#L255-L271) - [RefundContract.markOrderAsReturned(uint256)](contracts/RefundContract.sol#L273-L303) - [RefundContract.markOrderAsShipped(uint256)](contracts/RefundContract.sol#L237-L253) - [RefundContract.payOrder(uint256,uint256)](contracts/RefundContract.sol#L156-L183) - [RefundContract.refundOrder(uint256)](contracts/RefundContract.sol#L305-L345) - [RefundContract.updateOwnersBalance(uint256)](contracts/RefundContract.sol#L347-L385)

contracts/RefundContract.sol#L156-L183

## reentrancy-events

Impact: Low
Confidence: Medium

- [ ] ID-7
      Reentrancy in [RefundContract.withdrawOwnerBalance()](contracts/RefundContract.sol#L392-L401):
      External calls: - [erc20Contract.transfer(owner,amount)](contracts/RefundContract.sol#L399)
      Event emitted after the call(s): - [OwnerBalanceWithdrawn(owner,amount)](contracts/RefundContract.sol#L400)

contracts/RefundContract.sol#L392-L401

- [ ] ID-8
      Reentrancy in [RefundContract.payOrder(uint256,uint256)](contracts/RefundContract.sol#L156-L183):
      External calls: - [erc20Contract.transferFrom(msg.sender,address(this),wad)](contracts/RefundContract.sol#L173)
      Event emitted after the call(s): - [OrderPaid(orderId,msg.sender,wad,Status.PAID,orders[orderId].externalOrderNumber)](contracts/RefundContract.sol#L175-L181)

contracts/RefundContract.sol#L156-L183

- [ ] ID-9
      Reentrancy in [RefundContract.refundOrder(uint256)](contracts/RefundContract.sol#L305-L345):
      External calls: - [erc20Contract.transfer(order.customer,order.amount)](contracts/RefundContract.sol#L333)
      Event emitted after the call(s): - [OrderRefunded(orderId,order.customer,order.amount,Status.REFUNDED,order.externalOrderNumber)](contracts/RefundContract.sol#L338-L344)

contracts/RefundContract.sol#L305-L345

## timestamp

Impact: Low
Confidence: Medium

- [ ] ID-10
      [RefundContract.payOrder(uint256,uint256)](contracts/RefundContract.sol#L156-L183) uses timestamp for comparisons
      Dangerous comparisons: - [require(bool,string)(orders[orderId].customer != address(0),Order does not exist)](contracts/RefundContract.sol#L159) - [require(bool,string)(orders[orderId].customer == msg.sender,Only the customer can pay for the order)](contracts/RefundContract.sol#L160-L163) - [require(bool,string)(orders[orderId].status == Status.CREATED,Order must be marked as unpaid to be paid)](contracts/RefundContract.sol#L164-L167) - [require(bool,string)(wad == orders[orderId].amount,Payment amount must match order amount)](contracts/RefundContract.sol#L168-L171)

contracts/RefundContract.sol#L156-L183

- [ ] ID-11
      [RefundContract.refundOrder(uint256)](contracts/RefundContract.sol#L305-L345) uses timestamp for comparisons
      Dangerous comparisons: - [require(bool,string)(order.customer != address(0) && order.status != Status.REFUNDED,Order does not exist or has already been refunded)](contracts/RefundContract.sol#L313-L316) - [require(bool,string)(order.status == Status.RETURNED || order.status == Status.PAID,Order must be marked as returned or paid to be refunded)](contracts/RefundContract.sol#L318-L321) - [require(bool,string)(msg.sender == order.customer,Orders can only be refunded by the customer)](contracts/RefundContract.sol#L323-L326) - [require(bool,string)(refundPeriodActive(order.createdAt) && order.closedAt == 0,Order refund period has expired)](contracts/RefundContract.sol#L327-L330)

contracts/RefundContract.sol#L305-L345

- [ ] ID-12
      [RefundContract.refundPeriodActive(uint256)](contracts/RefundContract.sol#L151-L153) uses timestamp for comparisons
      Dangerous comparisons: - [(createdAt + refundDuration) > block.timestamp](contracts/RefundContract.sol#L152)

contracts/RefundContract.sol#L151-L153

- [ ] ID-13
      [RefundContract.markOrderAsReturned(uint256)](contracts/RefundContract.sol#L273-L303) uses timestamp for comparisons
      Dangerous comparisons: - [require(bool,string)(order.customer != address(0),Order does not exist)](contracts/RefundContract.sol#L275) - [require(bool,string)(order.status != Status.RETURNED,Order has already been returned)](contracts/RefundContract.sol#L277-L280) - [require(bool,string)(order.status == Status.DELIVERED,Order must be marked as delivered to be returned)](contracts/RefundContract.sol#L282-L285) - [require(bool,string)((block.timestamp - order.createdAt <= refundDuration) && order.closedAt == 0,Order refund period has expired)](contracts/RefundContract.sol#L287-L291)

contracts/RefundContract.sol#L273-L303

## assembly

Impact: Informational
Confidence: High

- [ ] ID-14
      [console.\_sendLogPayloadImplementation(bytes)](node_modules/hardhat/console.sol#L8-L23) uses assembly - [INLINE ASM](node_modules/hardhat/console.sol#L11-L22)

node_modules/hardhat/console.sol#L8-L23

- [ ] ID-15
      [console.\_castToPure(function(bytes))](node_modules/hardhat/console.sol#L25-L31) uses assembly - [INLINE ASM](node_modules/hardhat/console.sol#L28-L30)

node_modules/hardhat/console.sol#L25-L31

## pragma

Impact: Informational
Confidence: High

- [ ] ID-16
      Different versions of Solidity are used: - Version used: ['0.8.21', '>=0.4.22<0.9.0', '^0.8.0'] - [0.8.21](contracts/RefundContract.sol#L6) - [>=0.4.22<0.9.0](node_modules/hardhat/console.sol#L2) - [^0.8.0](node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol#L4)

contracts/RefundContract.sol#L6

## solc-version

Impact: Informational
Confidence: High

- [ ] ID-17
      Pragma version[0.8.21](contracts/RefundContract.sol#L6) necessitates a version too recent to be trusted. Consider deploying with 0.8.18.

contracts/RefundContract.sol#L6

- [ ] ID-18
      Pragma version[^0.8.0](node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol#L4) allows old versions

node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol#L4

- [ ] ID-19
      solc-0.8.21 is not recommended for deployment

- [ ] ID-20
      Pragma version[>=0.4.22<0.9.0](node_modules/hardhat/console.sol#L2) is too complex

node_modules/hardhat/console.sol#L2

## naming-convention

Impact: Informational
Confidence: High

- [ ] ID-21
      Contract [console](node_modules/hardhat/console.sol#L4-L1552) is not in CapWords

node_modules/hardhat/console.sol#L4-L1552

## cache-array-length

Impact: Optimization
Confidence: High

- [ ] ID-22
      Loop condition [i < deliveryPartners.length](contracts/RefundContract.sol#L194) should use cached array length instead of referencing `length` member of the storage array.

contracts/RefundContract.sol#L194

## immutable-states

Impact: Optimization
Confidence: High

- [ ] ID-23
      [RefundContract.refundDuration](contracts/RefundContract.sol#L14) should be immutable

contracts/RefundContract.sol#L14

- [ ] ID-24
      [RefundContract.erc20Contract](contracts/RefundContract.sol#L10) should be immutable

contracts/RefundContract.sol#L10

- [ ] ID-25
      [RefundContract.owner](contracts/RefundContract.sol#L12) should be immutable

contracts/RefundContract.sol#L12
