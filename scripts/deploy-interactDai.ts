import { ethers } from "hardhat";

async function deploy() {
    const InteractDaiContract = await ethers.getContractFactory("InteractDaiContract");
    const interactDaiContract = await InteractDaiContract.deploy("0x6B175474E89094C44Da98b954EedeAC495271d0F");
    await interactDaiContract.deployed();
    console.log("Contract deployed to address:", interactDaiContract.address);
}

deploy()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
