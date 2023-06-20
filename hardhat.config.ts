import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
import "hardhat-gas-reporter";
import "hardhat-tracer";
import "hardhat-storage-layout";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
      forking: {
        // Fork of ETH mainnet
        url: process.env.ALCHEMY_MAINNET_URL || "",
        // Fix blockchain state forking at 2023-04-07 17:19:47 UTC for testing reasons
        blockNumber: 16998046,
      },
    },
  },
  gasReporter: {
    enabled: true,
  },
};

export default config;
