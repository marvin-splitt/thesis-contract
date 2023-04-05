// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

// DAI contract interface
interface DaiContract {
    function approve(address guy, uint wad) external returns (bool);

    function transferFrom(
        address src,
        address dst,
        uint wad
    ) external returns (bool);
}

contract InteractDaiContract {
    DaiContract private daiContract;

    string public symbol;

    constructor(address daiContractAddress) {
        daiContract = DaiContract(daiContractAddress);
    }

    function transfer(address dst, uint wad) public returns (bool) {
        return daiContract.transferFrom(msg.sender, dst, wad);
    }

    function approve(address guy, uint wad) public returns (bool) {
        return daiContract.approve(guy, wad);
    }

    function transferFrom(
        address src,
        address dst,
        uint wad
    ) public returns (bool) {
        return daiContract.transferFrom(src, dst, wad);
    }
}
