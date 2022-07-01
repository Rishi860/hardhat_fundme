const { assert, expect } = require("chai");
const { devlopmentChains } = require("../../helper-hardhat-config");
const { deployments, ethers, getNamedAccounts, network } = require("hardhat");

!devlopmentChains.includes(network.name) // this will only run on testnets
  ? describe.skip
  : describe("FundMe", async function () {
      let fundMe;
      let deployer;
      let mockV3Aggregator;
      const sendValue = ethers.utils.parseEther("1"); // this is 1e18 or 1ETH
      beforeEach("FundMe", async function () {
        //deploy our FundMe contract
        // using hardhat deploy
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]); // we can provide the tags so that specific or all files can be deployed
        fundMe = await ethers.getContract("FundMe", deployer); // gets the most recent depolyed contract named funde me
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });
      describe("constructor", async function () {
        it("sets the aggregator address correctly", async function () {
          const response = await fundMe.getPriceFeed();
          assert.equal(response, mockV3Aggregator.address);
        });
      });

      describe("fund", async function () {
        it("fails if you dont send enough eth", async function () {
          // we want our code to revert or fail
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          );
        });
        it("updates the amount funded data structure", async function () {
          await fundMe.fund({ value: sendValue });
          const response = await fundMe.getAdressToAmountFunded(deployer);
          assert.equal(response.toString(), sendValue.toString());
        });
        it("adds funder to array of getFunder", async function () {
          await fundMe.fund({ value: sendValue });
          const response = await fundMe.getFunder(0);
          assert.equal(response, deployer);
        });
      });
      describe("withdraw", async function () {
        beforeEach(async function () {
          await fundMe.fund({ value: sendValue });
        });

        it("withdraw ETH from a single founder", async function () {
          // Arrange
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          // Act
          const transactionResponse = await fundMe.withdraw();
          const transactionReciept = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReciept;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          // Assert
          assert.equal(endingFundMeBalance.toString(), 0);
          assert.equal(
            startingDeployerBalance.add(startingFundMeBalance).toString(), // add big numbers using the add function
            endingDeployerBalance.add(gasCost).toString()
          );
        });
        it("allows us to withdraw with multiple getFunder", async function () {
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            // setting multiple getFunder
            let fundMeContractConnected = await fundMe.connect(accounts[i]); // gives connected contract
            await fundMeContractConnected.fund({ value: sendValue });
          }

          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Act
          const transactionResponse = await fundMe.withdraw();
          const transactionReciept = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReciept;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Assert
          assert.equal(endingFundMeBalance.toString(), 0);
          assert.equal(
            startingDeployerBalance.add(startingFundMeBalance).toString(), // add big numbers using the add function
            endingDeployerBalance.add(gasCost).toString()
          );

          // we reset getFunder after withdrawing
          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (let i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.getAdressToAmountFunded(accounts[i].address),
              0
            );
          }
        });
        it("only allows owner to withdraw", async function () {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const connectedAttackerAccount = await fundMe.connect(attacker);
          const owner = await fundMe.getOwner();
          assert.equal(owner, deployer);
          await expect(connectedAttackerAccount.withdraw()).to.be.revertedWith(
            "FundMe__NotOwner"
          );
        });

        it("cheaper withdraw", async function () {
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            // setting multiple getFunder
            let fundMeContractConnected = await fundMe.connect(accounts[i]); // gives connected contract
            await fundMeContractConnected.fund({ value: sendValue });
          }

          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Act
          const transactionResponse = await fundMe.cheaperWithdraw();
          const transactionReciept = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReciept;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Assert
          assert.equal(endingFundMeBalance.toString(), 0);
          assert.equal(
            startingDeployerBalance.add(startingFundMeBalance).toString(), // add big numbers using the add function
            endingDeployerBalance.add(gasCost).toString()
          );

          // we reset getFunder after withdrawing
          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (let i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.getAdressToAmountFunded(accounts[i].address),
              0
            );
          }
        });
      });
    });
