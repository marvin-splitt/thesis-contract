import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const deployFixture = async () => {

  const RefundContract = await ethers.getContractFactory("RefundContract");
  const refundContract = await RefundContract.deploy();
  const [admin, customer, deliveryPartner] = await ethers.getSigners();
  await refundContract.deployed();

  const orderRes = await refundContract
    .connect(admin)
    .createOrder(
      await customer.getAddress(),
      100
    )

  const orderReceipt = await orderRes.wait();
  return { refundContract, admin, customer, deliveryPartner, orderReceipt };
};

describe("RefundContract", () => {

  describe("Deployment", () => {
    it("Should deploy the contract", async () => {
      const { refundContract, admin } = await loadFixture(deployFixture);
      expect(await refundContract.owner()).to.equal(await admin.getAddress());
    });
  });


  describe("Setup", () => {

    it("Should allow only the owner to setup delivery partner", async () => {
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
  });


  describe("Orders", () => {
    it("Should allow only the owner to create a new order", async () => {
      const { refundContract, customer } = await loadFixture(
        deployFixture
      );
      await expect(
        refundContract
          .connect(customer)
          .createOrder(
            await customer.getAddress(),
            100
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
          .createOrder(
            await customer.getAddress(),
            0
          )
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
            100
          )
      ).to.emit(refundContract, "OrderCreated");
    })

    it("Should create a new order event and with an order hash", async () => {
      const { orderReceipt } = await loadFixture(
        deployFixture
      );

      // get event args of OrderCreated event
      const event = orderReceipt.events?.find((e) => e.event === "OrderCreated");
      const args = event?.args;

      expect(
        args?.orderId
      ).to.be.a.instanceOf(ethers.BigNumber);
    });

    it("Should create a new order mapping entry", async () => {
      const { refundContract, customer, orderReceipt } = await loadFixture(
        deployFixture
      );

      const event = orderReceipt.events?.find((e) => e.event === "OrderCreated");
      const args = event?.args;

      const order = await refundContract.getOrder(args?.orderId);
      expect(order.amount).to.equal(100);
      expect(order.status).to.equal(0);
      expect(order.customer).to.equal(await customer.getAddress());
    });

    it("Should allow only the owner to retrieve an order entry", async () => {
      const { refundContract, customer, orderReceipt } = await loadFixture(
        deployFixture
      );

      const event = orderReceipt.events?.find((e) => e.event === "OrderCreated");
      const args = event?.args;

      await expect(
        refundContract
          .connect(customer)
          .getOrder(args?.orderId)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  })
});
