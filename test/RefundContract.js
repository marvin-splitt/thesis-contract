const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

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
      expect(await refundContract.owner()).to.equal(admin.getAddress());
    });
  });
});
