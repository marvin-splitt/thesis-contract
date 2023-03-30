import { ethers, network } from "hardhat";

async function deploy() {
    const InteractDaiContract = await ethers.getContractFactory("InteractDaiContract");
    const interactDaiContract = InteractDaiContract.attach(process.env.INTERACT_DAI_CONTRACT_ADDRESS || "");
    const daiSymbol = await interactDaiContract.symbol();
    console.log("Dai symbol:", daiSymbol);

    const [myAccount] = await ethers.getSigners();

    // log current eth account balance
    console.log("My account ETH balance:", ethers.utils.formatEther(await myAccount.getBalance()));

    // log current account balance
    console.log("My account balance:", ethers.utils.formatEther(await interactDaiContract.balanceOf(myAccount.address)));
    // console.log("Contracts owner address:", ownerAddress);
    const pulseXAddress = '0x075e72a5eDf65F0A5f44699c7654C1a76941Ddc8';

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [pulseXAddress],
    });

    //   make pulseX the signer
    const signer = await ethers.getSigner(pulseXAddress);

    console.log("PulseX ETH account balance:", ethers.utils.formatEther(await signer.getBalance()));

    console.log(
        "PulseX account before transaction",
        ethers.utils.formatEther(await interactDaiContract.balanceOf(pulseXAddress))
    );

    const recieptTx = await interactDaiContract.connect(signer).transfer(myAccount.address, ethers.utils.parseEther("0.1"));

    await recieptTx.wait();

    console.log(`Transaction successful with hash: ${recieptTx.hash}`);
    console.log(
        "PulseX account after transaction",
        ethers.utils.formatEther(await interactDaiContract.balanceOf(pulseXAddress))
    );
    console.log("My account balance:", ethers.utils.formatEther(await interactDaiContract.balanceOf(myAccount.address)));
}

deploy()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
