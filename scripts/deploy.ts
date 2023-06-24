import { ethers, network } from "hardhat";
import { daiAbi } from "../lib/abi";

async function main() {
  const RefundContract = await ethers.getContractFactory("RefundContract");
  const refundContract = await RefundContract.deploy(
    process.env.DAI_CONTRACT_ADDRESS!,
    14
  );
  const [admin, customer, deliveryPartner] = await ethers.getSigners();
  await refundContract.deployed();

  console.log("RefundContract deployed to:", refundContract.address);
  console.log("Admin address:", await admin.getAddress());
  console.log("Customer address:", await customer.getAddress());
  console.log("Delivery Partner address:", await deliveryPartner.getAddress());

  await refundContract.addDeliveryPartner(await deliveryPartner.getAddress());

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
    customer
  );
  // send 1000 dai to customer
  await daiContract
    .connect(impersonatedAccount)
    .transfer(await customer.getAddress(), ethers.utils.parseEther("1000"));

  console.log(
    "Customer DAI balance:",
    ethers.utils.formatEther(
      await daiContract.balanceOf(await customer.getAddress())
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
