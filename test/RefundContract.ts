import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const deployFixture = async () => {
  const RefundContract = await ethers.getContractFactory("RefundContract");
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
  describe("Transactions", () => {
    it("Should allow only the owner to create a new transaction", async () => {
      const { refundContract, customer, deliveryPartner } = await loadFixture(
        deployFixture
      );
      await expect(
        refundContract
          .connect(customer)
          .createTransaction(
            await customer.getAddress(),
            100
          )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should to create a new transaction and return the transaction id", async () => {
      const { refundContract, customer } = await loadFixture(
        deployFixture
      );
      expect(
        refundContract
          .createTransaction(
            await customer.getAddress(),
            100
          )
      ).to.be.a.properAddress;
    });
  })
});
