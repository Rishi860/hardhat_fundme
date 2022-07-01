const { network } = require("hardhat");
const {
  devlopmentChains,
  DECIMALS,
  INITIAL_ANSWER,
} = require("../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments; // deploy and log are some functions
  const { deployer } = await getNamedAccounts();

  if (devlopmentChains.includes(network.name)) {
    log("Local network detected! Deploying Mocks...");
    await deploy("MockV3Aggregator", {
      contract: "MockV3Aggregator",
      from: deployer,
      log: true,
      args: [DECIMALS, INITIAL_ANSWER],
    });
    log("Mocks deployed");
    log("____________________");
  }
};

module.exports.tags = ["all", "mocks"];
