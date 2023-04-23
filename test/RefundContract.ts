import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";

const daiAbi = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address recipient, uint256 amount) external returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
]

const deployFixture = async () => {

  const RefundContract = await ethers.getContractFactory("RefundContract");
  const refundContract = await RefundContract.deploy(process.env.DAI_CONTRACT_ADDRESS!);
  const [admin, customer, deliveryPartner, addedDeliveryPartner] = await ethers.getSigners();
  await refundContract.deployed();

  const orderRes = await refundContract
    .connect(admin)
    .createOrder(
      await customer.getAddress(),
      100
    )

  const orderReceipt = await orderRes.wait();

  await refundContract.addDeliveryPartner(
    await addedDeliveryPartner.getAddress()
  );

  // setup customers wallet
  await network.provider.send("hardhat_impersonateAccount", [process.env.DAI_IMPERSONATE_ACCOUNT_ADDRESS!]);
  const impersonatedAccount = ethers.provider.getSigner(process.env.DAI_IMPERSONATE_ACCOUNT_ADDRESS!);
  const daiContract = new ethers.Contract(process.env.DAI_CONTRACT_ADDRESS!, daiAbi, impersonatedAccount);
  // send 1000 dai to customer
  await daiContract.connect(impersonatedAccount).transfer(await customer.getAddress(), ethers.utils.parseEther("1000"));

  return { refundContract, admin, customer, deliveryPartner, orderReceipt, addedDeliveryPartner, daiContract };
};

describe("RefundContract", () => {

  describe("Deployment", () => {
    it("Should deploy the contract with the correct owner", async () => {
      const { refundContract, admin } = await loadFixture(deployFixture);
      expect(await refundContract.owner()).to.equal(await admin.getAddress());
    });

    it("Should deploy the contract with the correct dai contract address", async () => {
      const { refundContract } = await loadFixture(deployFixture);
      expect(await refundContract.daiContract()).to.equal(process.env.DAI_CONTRACT_ADDRESS);
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
        refundContract.addDeliveryPartner(
          await deliveryPartner.getAddress()
        )
      ).to.emit(refundContract, "DeliveryPartnerAdded").withArgs(
        await deliveryPartner.getAddress()
      );
    });
  });

  describe("Setup Customers Payment", () => {
    it("Customer should have at least 1000 DAI", async () => {
      const { daiContract, customer } = await loadFixture(deployFixture);
      expect(await daiContract.balanceOf(await customer.getAddress())).to.greaterThanOrEqual(ethers.utils.parseEther("1000"));
    });

    it("Customer should approve the contract to spend DAI", async () => {
      const { refundContract, customer, daiContract } = await loadFixture(deployFixture);

      await daiContract.connect(customer).approve(refundContract.address, ethers.utils.parseEther("100"));
      expect(await daiContract.allowance(await customer.getAddress(), refundContract.address)).to.equal(ethers.utils.parseEther("100"));
    });

    it("Contract should transfer DAI from the customers wallet to the contract", async () => {
      const { refundContract, customer, daiContract } = await loadFixture(deployFixture);
      await daiContract.connect(customer).approve(refundContract.address, ethers.utils.parseEther("100"));
      await refundContract.connect(customer).payOrder(ethers.utils.parseEther("100"));
      expect(await daiContract.balanceOf(refundContract.address)).to.equal(ethers.utils.parseEther("100"));
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

    it("Should reject to mark the status of an order entry as shipped if caller is not delivery partner", async () => {
      const { refundContract, customer, orderReceipt } = await loadFixture(
        deployFixture
      );

      const event = orderReceipt.events?.find((e) => e.event === "OrderCreated");
      const args = event?.args;

      await expect(
        refundContract
          .connect(customer)
          .markOrderAsShipped(args?.orderId)
      ).to.be.revertedWith("Only delivery partners can call this function");

    });

    it("Should reject to mark the status of an order entry as shipped if order is not paid", async () => {
      const { refundContract, addedDeliveryPartner, orderReceipt } = await loadFixture(
        deployFixture
      );

      const event = orderReceipt.events?.find((e) => e.event === "OrderCreated");
      const args = event?.args;

      await expect(
        refundContract
          .connect(addedDeliveryPartner)
          .markOrderAsShipped(args?.orderId)
      ).to.be.revertedWith("Order must be marked as paid to be shipped");

    });
  });

});
