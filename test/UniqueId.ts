import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const deployFixture = async () => {
    const UniqueId = await ethers.getContractFactory('UniqueId');
    const uniqueId = await UniqueId.deploy();
    await uniqueId.deployed();
    return { uniqueId };
}


describe('Library', () => {
    it('Should return a unique id', async () => {
        const { uniqueId } = await loadFixture(deployFixture);
        const id = await uniqueId.getUniqueId();
        expect(id).to.be.a.properHex(64);
    });

});