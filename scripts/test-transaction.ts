import { ethers, network } from "hardhat";
async function send() {
    const vitalik_address = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";
    const addressTo = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

    //  impersonating vitalik's account
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [vitalik_address],
    });

    //   make vitalik the signer
    const signer = await ethers.getSigner(vitalik_address);

    console.log(
        "Vitalik account before transaction",
        ethers.utils.formatEther(await signer.getBalance())
    );

    //   create  transaction
    const tx = {
        to: addressTo,
        value: ethers.utils.parseEther("0.01"),
    };

    const recieptTx = await signer.sendTransaction(tx);

    await recieptTx.wait();

    console.log(`Transaction successful with hash: ${recieptTx.hash}`);
    console.log(
        "Vitalik account after transaction",
        ethers.utils.formatEther(await signer.getBalance())
    );
}

send()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
