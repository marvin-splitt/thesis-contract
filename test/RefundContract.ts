import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const deployFixture = async () => {
  const UniqueId = await ethers.getContractFactory('UniqueId');
  const uniqueId = await UniqueId.deploy();
  await uniqueId.deployed();

  const RefundContract = await ethers.getContractFactory("RefundContract", {
    libraries: {
      UniqueId: uniqueId.address
    }
  });
  const refundContract = await RefundContract.deploy();
  const [admin, customer, deliveryPartner] = await ethers.getSigners();
  await refundContract.deployed();
  return { refundContract, admin, customer, deliveryPartner };
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
      const { refundContract, admin, deliveryPartner } = await loadFixture(
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
      const { refundContract, customer, deliveryPartner } = await loadFixture(
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
      const { refundContract, customer, admin } = await loadFixture(
        deployFixture
      );
      const tId = await refundContract
        .connect(admin)
        .createOrder(
          await customer.getAddress(),
          100
        )

      // get event args of OrderCreated event
      const receipt = await tId.wait();
      const event = receipt.events?.find((e) => e.event === "OrderCreated");
      const args = event?.args;

      expect(
        args?.orderId
      ).to.be.a.properHex(64);
    });

    it("Should create a new order mapping entry", async () => {
      const { refundContract, customer, admin } = await loadFixture(
        deployFixture
      );
      const tId = await refundContract
        .connect(admin)
        .createOrder(
          await customer.getAddress(),
          100
        )

      // get event args of OrderCreated event
      const receipt = await tId.wait();
      const event = receipt.events?.find((e) => e.event === "OrderCreated");
      const args = event?.args;

      const order = await refundContract.getOrder(args?.orderId);
      expect(order.amount).to.equal(100);
      expect(order.status).to.equal(0);
      expect(order.customer).to.equal(await customer.getAddress());
    });
  })
});
