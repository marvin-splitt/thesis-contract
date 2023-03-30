// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

// DAI contract interface
interface DaiContract {
    function symbol() external view returns (string memory);

    function getOwner() external view returns (address);

    function approve(address guy, uint wad) external returns (bool);

    function transfer(address dst, uint wad) external returns (bool);

    function transferFrom(
        address src,
        address dst,
        uint wad
    ) external returns (bool);

    function balanceOf(address guy) external view returns (uint);
}

contract InteractDaiContract {
    DaiContract private daiContract;

    string public symbol;

    constructor(address daiContractAddress) {
        daiContract = DaiContract(daiContractAddress);
        symbol = daiContract.symbol();
    }

    function transfer(address dst, uint wad) public returns (bool) {
        return daiContract.transfer(dst, wad);
    }

    function approve(address guy, uint wad) public returns (bool) {
        return daiContract.approve(guy, wad);
    }

    // function transferFrom(
    //     address src,
    //     address dst,
    //     uint wad
    // ) public returns (bool) {
    //     return daiContract.transferFrom(src, dst, wad);
    // }

    function balanceOf(address guy) public view returns (uint) {
        return daiContract.balanceOf(guy);
    }
}
