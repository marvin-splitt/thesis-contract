import { ethers, network } from "hardhat";

const daiAbi = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
]

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

    await network.provider.send("hardhat_impersonateAccount", [pulseXAddress]);

    //   make pulseX the signer
    const signer = await ethers.getSigner(pulseXAddress);

    const daiContract = new ethers.Contract('0x6B175474E89094C44Da98b954EedeAC495271d0F', daiAbi, signer);

    console.log("PulseX account balance:", ethers.utils.formatEther(await daiContract.balanceOf(pulseXAddress)));

    console.log(
        "PulseX account before transaction",
        ethers.utils.formatEther(await interactDaiContract.balanceOf(pulseXAddress))
    );

    await daiContract.connect(signer).approve(interactDaiContract.address, ethers.utils.parseEther("0.01"), { gasLimit: 1000000 });

    const recieptTx = await interactDaiContract.connect(signer).transfer(myAccount.address, ethers.utils.parseEther("0.01"), { gasLimit: 1000000 });

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
