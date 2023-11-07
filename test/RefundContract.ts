import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";

const daiAbi = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address recipient, uint256 amount) external returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

const orderNumber = 10000001;

const deployFixture = async () => {
  const RefundContract = await ethers.getContractFactory("RefundContract");
  const refundContract = await RefundContract.deploy(
    process.env.DAI_CONTRACT_ADDRESS!,
    14
  );
  const [admin, customer, deliveryPartner, addedDeliveryPartner] =
    await ethers.getSigners();
  await refundContract.deployed();

  const orderRes = await refundContract
    .connect(admin)
    .createOrder(
      await customer.getAddress(),
      ethers.utils.parseEther("100"),
      orderNumber
    );

  const orderReceipt = await orderRes.wait();

  await refundContract.addDeliveryPartner(
    await addedDeliveryPartner.getAddress()
  );

  // setup customers wallet
  await network.provider.send("hardhat_impersonateAccount", [
    process.env.DAI_IMPERSONATE_ACCOUNT_ADDRESS!,
  ]);
  const impersonatedAccount = ethers.provider.getSigner(
    process.env.DAI_IMPERSONATE_ACCOUNT_ADDRESS!
  );
  const daiContract = new ethers.Contract(
    process.env.DAI_CONTRACT_ADDRESS!,
    daiAbi,
    impersonatedAccount
  );
  // send 1000 dai to customer
  await daiContract
    .connect(impersonatedAccount)
    .transfer(await customer.getAddress(), ethers.utils.parseEther("1000"));
  await daiContract
    .connect(customer)
    .approve(refundContract.address, ethers.utils.parseEther("100"));

  return {
    refundContract,
    admin,
    customer,
    deliveryPartner,
    orderReceipt,
    addedDeliveryPartner,
    daiContract,
  };
};

describe("RefundContract", () => {
  describe("Deployment", () => {
    it("Should deploy the contract with the correct owner", async () => {
      const { refundContract, admin } = await loadFixture(deployFixture);
      expect(await refundContract.owner()).to.equal(await admin.getAddress());
    });

    it("Should deploy the contract with the correct dai contract address", async () => {
      const { refundContract } = await loadFixture(deployFixture);
      expect(await refundContract.erc20Contract()).to.equal(
        process.env.DAI_CONTRACT_ADDRESS
      );
    });

    it("Should deploy the contract with the correct refund duration", async () => {
      const { refundContract } = await loadFixture(deployFixture);
      // refund duration is 14 days in seconds
      expect(await refundContract.refundDuration()).to.equal(14 * 24 * 60 * 60);
    });
  });

  describe("Setup Contract", () => {
    it("Should reject adding delivery partner if not owner", async () => {
      const { refundContract, customer, deliveryPartner } = await loadFixture(
        deployFixture
      );
      await expect(
        refundContract
          .connect(customer)
          .addDeliveryPartner(await deliveryPartner.getAddress())
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow the owner to setup delivery partner", async () => {
      const { refundContract, deliveryPartner } = await loadFixture(
        deployFixture
      );
      await refundContract.addDeliveryPartner(
        await deliveryPartner.getAddress()
      );
      expect(
        await refundContract.isDeliveryPartner(
          await deliveryPartner.getAddress()
        )
      ).to.be.true;
    });

    it("Should emit a DeliveryPartnerAdded event", async () => {
      const { refundContract, deliveryPartner } = await loadFixture(
        deployFixture
      );
      await expect(
        refundContract.addDeliveryPartner(await deliveryPartner.getAddress())
      )
        .to.emit(refundContract, "DeliveryPartnerAdded")
        .withArgs(await deliveryPartner.getAddress());
    });
  });

  describe("Setup Customers Payment", () => {
    it("Customer should have at least 1000 DAI", async () => {
      const { daiContract, customer } = await loadFixture(deployFixture);
      expect(
        await daiContract.balanceOf(await customer.getAddress())
      ).to.greaterThanOrEqual(ethers.utils.parseEther("1000"));
    });

    it("Customer should approve the contract to spend DAI", async () => {
      const { refundContract, customer, daiContract } = await loadFixture(
        deployFixture
      );

      expect(
        await daiContract.allowance(
          await customer.getAddress(),
          refundContract.address
        )
      ).to.equal(ethers.utils.parseEther("100"));
    });

    it("Contract should transfer DAI from the customers wallet to the contract", async () => {
      const { refundContract, customer, daiContract, orderReceipt } =
        await loadFixture(deployFixture);
      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      expect(await daiContract.balanceOf(refundContract.address)).to.equal(
        ethers.utils.parseEther("100")
      );
    });
  });

  describe("Orders", () => {
    it("Should allow only the owner to create a new order", async () => {
      const { refundContract, customer } = await loadFixture(deployFixture);
      await expect(
        refundContract
          .connect(customer)
          .createOrder(
            await customer.getAddress(),
            ethers.utils.parseEther("100"),
            "10000001"
          )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should only allow amounts greater than 0", async () => {
      const { refundContract, customer, admin } = await loadFixture(
        deployFixture
      );
      await expect(
        refundContract
          .connect(admin)
          .createOrder(await customer.getAddress(), 0, "10000001")
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should emit a OrderCreated event", async () => {
      const { refundContract, customer, admin } = await loadFixture(
        deployFixture
      );
      await expect(
        refundContract
          .connect(admin)
          .createOrder(
            await customer.getAddress(),
            ethers.utils.parseEther("100"),
            "10000001"
          )
      ).to.emit(refundContract, "OrderCreated");
    });

    it("Should create a new order event and with an order hash", async () => {
      const { orderReceipt } = await loadFixture(deployFixture);

      // get event args of OrderCreated event
      const event = orderReceipt.events?.find(
        (e) => e.event === "OrderCreated"
      );
      const args = event?.args;

      expect(args?.orderId).to.be.a.instanceOf(ethers.BigNumber);
    });

    it("Should create a new order mapping entry", async () => {
      const { refundContract, customer, orderReceipt } = await loadFixture(
        deployFixture
      );

      const event = orderReceipt.events?.find(
        (e) => e.event === "OrderCreated"
      );
      const args = event?.args;

      const order = await refundContract.getOrder(args?.orderId);
      expect(order.amount).to.equal(ethers.utils.parseEther("100"));
      expect(order.status).to.equal(0);
      expect(order.customer).to.equal(await customer.getAddress());
    });

    it("Should allow only the owner to retrieve an order entry", async () => {
      const { refundContract, customer, orderReceipt } = await loadFixture(
        deployFixture
      );

      const event = orderReceipt.events?.find(
        (e) => e.event === "OrderCreated"
      );
      const args = event?.args;

      await expect(
        refundContract.connect(customer).getOrder(args?.orderId)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should reject to mark the status of an order entry as shipped if caller is not delivery partner", async () => {
      const { refundContract, customer, orderReceipt } = await loadFixture(
        deployFixture
      );

      const event = orderReceipt.events?.find(
        (e) => e.event === "OrderCreated"
      );
      const args = event?.args;

      await expect(
        refundContract.connect(customer).markOrderAsShipped(args?.orderId)
      ).to.be.revertedWith("Only delivery partners can call this function");
    });

    it("Should reject to mark the status of an order entry as shipped if order is not paid", async () => {
      const { refundContract, addedDeliveryPartner, orderReceipt } =
        await loadFixture(deployFixture);

      const event = orderReceipt.events?.find(
        (e) => e.event === "OrderCreated"
      );
      const args = event?.args;

      await expect(
        refundContract
          .connect(addedDeliveryPartner)
          .markOrderAsShipped(args?.orderId)
      ).to.be.revertedWith("Order must be marked as paid to be shipped");
    });
  });

  describe("Payments", () => {
    it("Should mark an order as paid", async () => {
      const { refundContract, customer, orderReceipt } = await loadFixture(
        deployFixture
      );

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);

      const order = await refundContract.getOrder(orderId);
      expect(order.status).to.equal(1);
    });

    it("Should reject if amount is less than 0", async () => {
      const { refundContract, customer, orderReceipt } = await loadFixture(
        deployFixture
      );

      const orderId = orderReceipt.events![0].args![0];

      await expect(
        refundContract
          .connect(customer)
          .payOrder(ethers.utils.parseEther("0"), orderId)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should reject if the order id is 0", async () => {
      const { refundContract, customer } = await loadFixture(deployFixture);

      await expect(
        refundContract
          .connect(customer)
          .payOrder(ethers.utils.parseEther("100"), 0)
      ).to.be.revertedWith("Order ID must be greater than 0");
    });

    it("Should reject if the caller is not the customer", async () => {
      const { refundContract, admin, orderReceipt } = await loadFixture(
        deployFixture
      );

      const orderId = orderReceipt.events![0].args![0];

      await expect(
        refundContract
          .connect(admin)
          .payOrder(ethers.utils.parseEther("100"), orderId)
      ).to.be.revertedWith("Only the customer can pay for the order");
    });

    it("Should reject payments if the order is already paid", async () => {
      const { refundContract, customer, orderReceipt, daiContract } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);

      await daiContract
        .connect(customer)
        .approve(refundContract.address, ethers.utils.parseEther("100"));

      await expect(
        refundContract
          .connect(customer)
          .payOrder(ethers.utils.parseEther("100"), orderId)
      ).to.be.revertedWith("Order must be marked as unpaid to be paid");
    });

    it("Should reject payments if the order does not exist", async () => {
      const { refundContract, customer } = await loadFixture(deployFixture);

      await expect(
        refundContract
          .connect(customer)
          .payOrder(ethers.utils.parseEther("100"), 10001)
      ).to.be.revertedWith("Order does not exist");
    });

    it("Should reject payments if the order is not paid with the correct amount", async () => {
      const { refundContract, customer, orderReceipt } = await loadFixture(
        deployFixture
      );

      const orderId = orderReceipt.events![0].args![0];

      await expect(
        refundContract
          .connect(customer)
          .payOrder(ethers.utils.parseEther("10"), orderId)
      ).to.be.revertedWith("Payment amount must match order amount");
    });

    it("Should emit a OrderPaid event", async () => {
      const { refundContract, customer, orderReceipt } = await loadFixture(
        deployFixture
      );

      const orderId = orderReceipt.events![0].args![0];

      await expect(
        refundContract
          .connect(customer)
          .payOrder(ethers.utils.parseEther("100"), orderId)
      )
        .to.emit(refundContract, "OrderPaid")
        .withArgs(
          orderId,
          await customer.getAddress(),
          ethers.utils.parseEther("100"),
          1,
          10000001
        );
    });
  });

  describe("Delivery", () => {
    it("Should mark an order as shipped", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);

      const order = await refundContract.getOrder(orderId);
      expect(order.status).to.equal(2);
    });

    it("Should reject to mark an order as shipped if the order is not paid", async () => {
      const { refundContract, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await expect(
        refundContract.connect(addedDeliveryPartner).markOrderAsShipped(orderId)
      ).to.be.revertedWith("Order must be marked as paid to be shipped");
    });

    it("Should reject to mark an order as shipped if the caller is not a delivery partner", async () => {
      const { refundContract, customer, orderReceipt } = await loadFixture(
        deployFixture
      );

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);

      await expect(
        refundContract.connect(customer).markOrderAsShipped(orderId)
      ).to.be.revertedWith("Only delivery partners can call this function");
    });

    it("Should reject to mark an order as shipped if the order does not exist", async () => {
      const { refundContract, addedDeliveryPartner } = await loadFixture(
        deployFixture
      );

      await expect(
        refundContract
          .connect(addedDeliveryPartner)
          .markOrderAsShipped(100000000000)
      ).to.be.revertedWith("Order does not exist");
    });

    it("Should emit a OrderShipped event", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);

      await expect(
        refundContract.connect(addedDeliveryPartner).markOrderAsShipped(orderId)
      )
        .to.emit(refundContract, "OrderShipped")
        .withArgs(
          orderId,
          await customer.getAddress(),
          await addedDeliveryPartner.getAddress(),
          2,
          10000001
        );
    });
  });

  describe("Delivery Confirmation", () => {
    it("Should mark an order as delivered", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];
      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);

      const order = await refundContract.getOrder(orderId);
      expect(order.status).to.equal(3);
    });

    it("Should reject to mark an order as delivered if the order is not shipped", async () => {
      const { refundContract, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await expect(
        refundContract
          .connect(addedDeliveryPartner)
          .markOrderAsDelivered(orderId)
      ).to.be.revertedWith("Order must be marked as shipped to be delivered");
    });

    it("Should reject to mark an order as delivered if the caller is not a delivery partner", async () => {
      const { refundContract, customer, orderReceipt } = await loadFixture(
        deployFixture
      );

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);

      await expect(
        refundContract.connect(customer).markOrderAsDelivered(orderId)
      ).to.be.revertedWith("Only delivery partners can call this function");
    });

    it("Should reject to mark an order as delivered if the order does not exist", async () => {
      const { refundContract, addedDeliveryPartner } = await loadFixture(
        deployFixture
      );

      await expect(
        refundContract
          .connect(addedDeliveryPartner)
          .markOrderAsDelivered(100000000000)
      ).to.be.revertedWith("Order does not exist");
    });
  });

  describe("Returns", () => {
    it("Should mark an order as returned", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsReturned(orderId);

      const order = await refundContract.getOrder(orderId);
      expect(order.status).to.equal(4);
    });

    it("Should reject to mark an order as returned if the order is not delivered", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);

      await expect(
        refundContract
          .connect(addedDeliveryPartner)
          .markOrderAsReturned(orderId)
      ).to.be.revertedWith("Order must be marked as delivered to be returned");
    });

    it("Should reject to mark an order as returned if the caller is not a delivery partner", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);

      await expect(
        refundContract.connect(customer).markOrderAsReturned(orderId)
      ).to.be.revertedWith("Only delivery partners can call this function");
    });

    it("Should reject to mark an order as returned if the order does not exist", async () => {
      const { refundContract, addedDeliveryPartner } = await loadFixture(
        deployFixture
      );

      await expect(
        refundContract
          .connect(addedDeliveryPartner)
          .markOrderAsReturned(100000000000)
      ).to.be.revertedWith("Order does not exist");
    });

    it("Should reject to mark an order as returned if the orders refund period of 14 days has expired", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);

      // Increase time by 14 days and 1 second to simulate the refund period has expired
      await ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 14 + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        refundContract
          .connect(addedDeliveryPartner)
          .markOrderAsReturned(orderId)
      ).to.be.revertedWith("Order refund period has expired");
    });

    it("Should reject to mark an order as returned if the order has already been returned", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsReturned(orderId);

      await expect(
        refundContract
          .connect(addedDeliveryPartner)
          .markOrderAsReturned(orderId)
      ).to.be.revertedWith("Order has already been returned");
    });

    it("Should add a time stamp to the order when it is marked as returned", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsReturned(orderId);

      const order = await refundContract.getOrder(orderId);
      expect(order.returnedAt).to.be.greaterThan(0);
    });

    it("Should emit a OrderReturned event", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);

      await expect(
        refundContract
          .connect(addedDeliveryPartner)
          .markOrderAsReturned(orderId)
      )
        .to.emit(refundContract, "OrderReturned")
        .withArgs(
          orderId,
          await customer.getAddress(),
          await addedDeliveryPartner.getAddress(),
          4,
          10000001
        );
    });
  });

  describe("Refunds", () => {
    it("Should refund an order", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];
      let order = await refundContract.getOrder(orderId);

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsReturned(orderId);
      await refundContract.connect(customer).refundOrder(orderNumber);

      order = await refundContract.getOrder(orderId);
      expect(order.status).to.equal(5);
    });

    it("Should reject to refund an order if the order is already shipped", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];
      const order = await refundContract.getOrder(orderId);

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);

      await expect(
        refundContract.connect(customer).refundOrder(orderNumber)
      ).to.be.revertedWith(
        "Order must be marked as returned or paid to be refunded"
      );
    });

    it("Should reject to refund an order if the caller is not the customer", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsReturned(orderId);

      await expect(
        refundContract.connect(addedDeliveryPartner).refundOrder(orderNumber)
      ).to.be.revertedWith("Orders can only be refunded by the customer");
    });

    it("Should reject to refund an order if the order id is 0", async () => {
      const { refundContract, customer } = await loadFixture(deployFixture);

      await expect(
        refundContract.connect(customer).refundOrder(0)
      ).to.be.revertedWith("Order does not exist");
    });

    it("Should reject to refund an order if the order does not exist", async () => {
      const { refundContract, customer } = await loadFixture(deployFixture);

      await expect(
        refundContract.connect(customer).refundOrder(10000000)
      ).to.be.revertedWith("Order does not exist or has already been refunded");
    });

    it("Should reject to refund an order if the orders refund period of 14 days has expired", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsReturned(orderId);

      // Increase time by 14 days and 1 second to simulate the refund period has expired
      await ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 14 + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        refundContract.connect(customer).refundOrder(orderNumber)
      ).to.be.revertedWith("Order refund period has expired");
    });

    it("Should reject to refund an order if the order has already been refunded", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsReturned(orderId);
      await refundContract.connect(customer).refundOrder(orderNumber);

      await expect(
        refundContract.connect(customer).refundOrder(orderNumber)
      ).to.be.revertedWith("Order does not exist or has already been refunded");
    });

    it("Should add a timestamp to the order when it has been refunded", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsReturned(orderId);
      await refundContract.connect(customer).refundOrder(orderNumber);

      const order = await refundContract.getOrder(orderId);
      expect(order.refundedAt).to.be.greaterThan(0);
    });

    it("Should refund the customer the correct amount", async () => {
      const {
        refundContract,
        customer,
        orderReceipt,
        addedDeliveryPartner,
        daiContract,
      } = await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];
      const orderPrice = ethers.utils.parseEther("100");
      const customersDaiBalance = await daiContract.balanceOf(
        await customer.getAddress()
      );

      await refundContract.connect(customer).payOrder(orderPrice, orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsReturned(orderId);
      await refundContract.connect(customer).refundOrder(orderNumber);

      expect(await daiContract.balanceOf(await customer.getAddress())).to.equal(
        customersDaiBalance
      );
    });

    it("Should emit a OrderRefunded event", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsReturned(orderId);

      await expect(refundContract.connect(customer).refundOrder(orderNumber))
        .to.emit(refundContract, "OrderRefunded")
        .withArgs(
          orderId,
          await customer.getAddress(),
          ethers.utils.parseEther("100"),
          5,
          orderNumber
        );
    });
  });

  describe("Updating Owner Balance", () => {
    it("Should update to the correct owner withdraw balance", async () => {
      const {
        refundContract,
        customer,
        orderReceipt,
        addedDeliveryPartner,
        daiContract,
        admin,
      } = await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];
      const orderPrice = ethers.utils.parseEther("100");

      await refundContract.connect(customer).payOrder(orderPrice, orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);

      const order = await refundContract.getOrder(orderId);

      // Increase time by 14 days and 1 second to simulate the refund period has expired
      await ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 14 + 1]);
      await ethers.provider.send("evm_mine", []);

      await refundContract.connect(admin).updateOwnersBalance(orderNumber);

      expect(await refundContract.getOwnersBalance()).to.equal(orderPrice);
    });

    it("Should emit an OrderClosed event", async () => {
      const {
        refundContract,
        customer,
        orderReceipt,
        addedDeliveryPartner,
        admin,
      } = await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];
      const orderPrice = ethers.utils.parseEther("100");

      await refundContract.connect(customer).payOrder(orderPrice, orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);

      const order = await refundContract.getOrder(orderId);

      // Increase time by 14 days and 1 second to simulate the refund period has expired
      await ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 14 + 1]);
      await ethers.provider.send("evm_mine", []);

      expect(
        await refundContract.connect(admin).updateOwnersBalance(orderNumber)
      )
        .to.emit(refundContract, "OrderClosed")
        .withArgs(orderId);
    });
  });

  describe("Owner Withdrawals", () => {
    it("Should reject to withdraw the owner balance if the caller is not the owner", async () => {
      const { refundContract, customer, orderReceipt, addedDeliveryPartner } =
        await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];

      await refundContract
        .connect(customer)
        .payOrder(ethers.utils.parseEther("100"), orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsReturned(orderId);

      await expect(
        refundContract.connect(addedDeliveryPartner).withdrawOwnerBalance()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should withdraw the correct amount to the owner", async () => {
      const {
        refundContract,
        customer,
        orderReceipt,
        addedDeliveryPartner,
        daiContract,
        admin,
      } = await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];
      const orderPrice = ethers.utils.parseEther("100").toString();
      const ownersDaiBalance = await daiContract.balanceOf(
        (await admin.getAddress()).toString()
      );

      await refundContract.connect(customer).payOrder(orderPrice, orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);

      // Increase time by 14 days and 1 second to simulate the refund period has expired
      await ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 14 + 1]);
      await ethers.provider.send("evm_mine", []);

      await refundContract.connect(admin).updateOwnersBalance(orderNumber);
      await refundContract.connect(admin).withdrawOwnerBalance();

      const newDaibalance = await daiContract.balanceOf(
        await admin.getAddress()
      );

      expect(newDaibalance).to.equal(ownersDaiBalance.add(orderPrice));
    });

    it("Should emit a OwnerBalanceWithdrawn event", async () => {
      const {
        refundContract,
        customer,
        orderReceipt,
        addedDeliveryPartner,
        admin,
      } = await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];
      const orderPrice = ethers.utils.parseEther("100");

      await refundContract.connect(customer).payOrder(orderPrice, orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);

      const order = await refundContract.getOrder(orderId);

      // Increase time by 14 days and 1 second to simulate the refund period has expired
      await ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 14 + 1]);
      await ethers.provider.send("evm_mine", []);

      await refundContract.connect(admin).updateOwnersBalance(orderNumber);

      await expect(refundContract.connect(admin).withdrawOwnerBalance())
        .to.emit(refundContract, "OwnerBalanceWithdrawn")
        .withArgs(await admin.getAddress(), orderPrice);
    });

    it("Should reset the owner balance to 0", async () => {
      const {
        refundContract,
        customer,
        orderReceipt,
        addedDeliveryPartner,
        daiContract,
        admin,
      } = await loadFixture(deployFixture);

      const orderId = orderReceipt.events![0].args![0];
      const orderPrice = ethers.utils.parseEther("100");

      await refundContract.connect(customer).payOrder(orderPrice, orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsShipped(orderId);
      await refundContract
        .connect(addedDeliveryPartner)
        .markOrderAsDelivered(orderId);

      // Increase time by 14 days and 1 second to simulate the refund period has expired
      await ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 14 + 1]);
      await ethers.provider.send("evm_mine", []);

      await refundContract.connect(admin).updateOwnersBalance(orderNumber);
      await refundContract.connect(admin).withdrawOwnerBalance();

      expect(await refundContract.connect(admin).getOwnersBalance()).to.equal(
        0
      );
    });

    it("Should reject to withdraw the owner balance if the owner balance is 0", async () => {
      const { refundContract, admin } = await loadFixture(deployFixture);

      await expect(
        refundContract.connect(admin).withdrawOwnerBalance()
      ).to.be.revertedWith("Owner balance must be greater than 0");
    });
  });
});
