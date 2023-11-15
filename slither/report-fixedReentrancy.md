**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results.
Summary

- [unchecked-transfer](#unchecked-transfer) (3 results) (High)
- [incorrect-equality](#incorrect-equality) (2 results) (Medium)
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
      [RefundContract.refundOrder(uint256)](contracts/RefundContract.sol#L304-L343) ignores return value by [erc20Contract.transfer(order.customer,order.amount)](contracts/RefundContract.sol#L335)

contracts/RefundContract.sol#L304-L343

- [ ] ID-1
      [RefundContract.payOrder(uint256,uint256)](contracts/RefundContract.sol#L156-L182) ignores return value by [erc20Contract.transferFrom(msg.sender,address(this),wad)](contracts/RefundContract.sol#L173)

contracts/RefundContract.sol#L156-L182

- [ ] ID-2
      [RefundContract.withdrawOwnerBalance()](contracts/RefundContract.sol#L390-L399) ignores return value by [erc20Contract.transfer(owner,amount)](contracts/RefundContract.sol#L397)

contracts/RefundContract.sol#L390-L399

## incorrect-equality

Impact: Medium
Confidence: High

- [ ] ID-3
      [RefundContract.payOrder(uint256,uint256)](contracts/RefundContract.sol#L156-L182) uses a dangerous strict equality: - [require(bool,string)(wad == orders[orderId].amount,Payment amount must match order amount)](contracts/RefundContract.sol#L168-L171)

contracts/RefundContract.sol#L156-L182

- [ ] ID-4
      [RefundContract.payOrder(uint256,uint256)](contracts/RefundContract.sol#L156-L182) uses a dangerous strict equality: - [require(bool,string)(orders[orderId].status == Status.CREATED,Order must be marked as unpaid to be paid)](contracts/RefundContract.sol#L164-L167)

contracts/RefundContract.sol#L156-L182

## reentrancy-events

Impact: Low
Confidence: Medium

- [ ] ID-5
      Reentrancy in [RefundContract.refundOrder(uint256)](contracts/RefundContract.sol#L304-L343):
      External calls: - [erc20Contract.transfer(order.customer,order.amount)](contracts/RefundContract.sol#L335)
      Event emitted after the call(s): - [OrderRefunded(orderId,order.customer,order.amount,Status.REFUNDED,order.externalOrderNumber)](contracts/RefundContract.sol#L336-L342)

contracts/RefundContract.sol#L304-L343

- [ ] ID-6
      Reentrancy in [RefundContract.payOrder(uint256,uint256)](contracts/RefundContract.sol#L156-L182):
      External calls: - [erc20Contract.transferFrom(msg.sender,address(this),wad)](contracts/RefundContract.sol#L173)
      Event emitted after the call(s): - [OrderPaid(orderId,msg.sender,wad,Status.PAID,orders[orderId].externalOrderNumber)](contracts/RefundContract.sol#L174-L180)

contracts/RefundContract.sol#L156-L182

- [ ] ID-7
      Reentrancy in [RefundContract.withdrawOwnerBalance()](contracts/RefundContract.sol#L390-L399):
      External calls: - [erc20Contract.transfer(owner,amount)](contracts/RefundContract.sol#L397)
      Event emitted after the call(s): - [OwnerBalanceWithdrawn(owner,amount)](contracts/RefundContract.sol#L398)

contracts/RefundContract.sol#L390-L399

## timestamp

Impact: Low
Confidence: Medium

- [ ] ID-8
      [RefundContract.payOrder(uint256,uint256)](contracts/RefundContract.sol#L156-L182) uses timestamp for comparisons
      Dangerous comparisons: - [require(bool,string)(orders[orderId].customer != address(0),Order does not exist)](contracts/RefundContract.sol#L159) - [require(bool,string)(orders[orderId].customer == msg.sender,Only the customer can pay for the order)](contracts/RefundContract.sol#L160-L163) - [require(bool,string)(orders[orderId].status == Status.CREATED,Order must be marked as unpaid to be paid)](contracts/RefundContract.sol#L164-L167) - [require(bool,string)(wad == orders[orderId].amount,Payment amount must match order amount)](contracts/RefundContract.sol#L168-L171)

contracts/RefundContract.sol#L156-L182

- [ ] ID-9
      [RefundContract.refundPeriodActive(uint256)](contracts/RefundContract.sol#L151-L153) uses timestamp for comparisons
      Dangerous comparisons: - [(createdAt + refundDuration) > block.timestamp](contracts/RefundContract.sol#L152)

contracts/RefundContract.sol#L151-L153

- [ ] ID-10
      [RefundContract.markOrderAsReturned(uint256)](contracts/RefundContract.sol#L272-L302) uses timestamp for comparisons
      Dangerous comparisons: - [require(bool,string)(order.customer != address(0),Order does not exist)](contracts/RefundContract.sol#L274) - [require(bool,string)(order.status != Status.RETURNED,Order has already been returned)](contracts/RefundContract.sol#L276-L279) - [require(bool,string)(order.status == Status.DELIVERED,Order must be marked as delivered to be returned)](contracts/RefundContract.sol#L281-L284) - [require(bool,string)((block.timestamp - order.createdAt <= refundDuration) && order.closedAt == 0,Order refund period has expired)](contracts/RefundContract.sol#L286-L290)

contracts/RefundContract.sol#L272-L302

- [ ] ID-11
      [RefundContract.refundOrder(uint256)](contracts/RefundContract.sol#L304-L343) uses timestamp for comparisons
      Dangerous comparisons: - [require(bool,string)(order.customer != address(0) && order.status != Status.REFUNDED,Order does not exist or has already been refunded)](contracts/RefundContract.sol#L312-L315) - [require(bool,string)(order.status == Status.RETURNED || order.status == Status.PAID,Order must be marked as returned or paid to be refunded)](contracts/RefundContract.sol#L317-L320) - [require(bool,string)(msg.sender == order.customer,Orders can only be refunded by the customer)](contracts/RefundContract.sol#L322-L325) - [require(bool,string)(refundPeriodActive(order.createdAt) && order.closedAt == 0,Order refund period has expired)](contracts/RefundContract.sol#L326-L329)

contracts/RefundContract.sol#L304-L343

## assembly

Impact: Informational
Confidence: High

- [ ] ID-12
      [console.\_sendLogPayloadImplementation(bytes)](node_modules/hardhat/console.sol#L8-L23) uses assembly - [INLINE ASM](node_modules/hardhat/console.sol#L11-L22)

node_modules/hardhat/console.sol#L8-L23

- [ ] ID-13
      [console.\_castToPure(function(bytes))](node_modules/hardhat/console.sol#L25-L31) uses assembly - [INLINE ASM](node_modules/hardhat/console.sol#L28-L30)

node_modules/hardhat/console.sol#L25-L31

## pragma

Impact: Informational
Confidence: High

- [ ] ID-14
      Different versions of Solidity are used: - Version used: ['0.8.21', '>=0.4.22<0.9.0', '^0.8.0'] - [0.8.21](contracts/RefundContract.sol#L6) - [>=0.4.22<0.9.0](node_modules/hardhat/console.sol#L2) - [^0.8.0](node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol#L4)

contracts/RefundContract.sol#L6

## solc-version

Impact: Informational
Confidence: High

- [ ] ID-15
      Pragma version[0.8.21](contracts/RefundContract.sol#L6) necessitates a version too recent to be trusted. Consider deploying with 0.8.18.

contracts/RefundContract.sol#L6

- [ ] ID-16
      Pragma version[^0.8.0](node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol#L4) allows old versions

node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol#L4

- [ ] ID-17
      solc-0.8.21 is not recommended for deployment

- [ ] ID-18
      Pragma version[>=0.4.22<0.9.0](node_modules/hardhat/console.sol#L2) is too complex

node_modules/hardhat/console.sol#L2

## naming-convention

Impact: Informational
Confidence: High

- [ ] ID-19
      Contract [console](node_modules/hardhat/console.sol#L4-L1552) is not in CapWords

node_modules/hardhat/console.sol#L4-L1552

## cache-array-length

Impact: Optimization
Confidence: High

- [ ] ID-20
      Loop condition [i < deliveryPartners.length](contracts/RefundContract.sol#L193) should use cached array length instead of referencing `length` member of the storage array.

contracts/RefundContract.sol#L193

## immutable-states

Impact: Optimization
Confidence: High

- [ ] ID-21
      [RefundContract.refundDuration](contracts/RefundContract.sol#L14) should be immutable

contracts/RefundContract.sol#L14

- [ ] ID-22
      [RefundContract.erc20Contract](contracts/RefundContract.sol#L10) should be immutable

contracts/RefundContract.sol#L10

- [ ] ID-23
      [RefundContract.owner](contracts/RefundContract.sol#L12) should be immutable

contracts/RefundContract.sol#L12
