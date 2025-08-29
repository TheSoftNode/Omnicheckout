import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("OmniCheckoutHook", function () {
  let omniCheckoutHook: any;
  let mockUSDC: any;
  let owner: any;
  let charity: any;
  let recipient: any;
  let otherAccount: any;

  const CHARITY_PERCENTAGE = 250; // 2.5%

  beforeEach(async function () {
    // Get signers
    [owner, charity, recipient, otherAccount] = await ethers.getSigners();

    // Deploy mock USDC
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDCFactory.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy OmniCheckoutHook
    const OmniCheckoutHookFactory = await ethers.getContractFactory("OmniCheckoutHook");
    omniCheckoutHook = await OmniCheckoutHookFactory.deploy(
      await mockUSDC.getAddress(),
      charity.address,
      CHARITY_PERCENTAGE
    );
    await omniCheckoutHook.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct charity address and percentage", async function () {
      const [charityAddr, percentage] = await omniCheckoutHook.getCharityConfig();
      expect(charityAddr).to.equal(charity.address);
      expect(percentage).to.equal(CHARITY_PERCENTAGE);
    });

    it("Should set the correct owner", async function () {
      expect(await omniCheckoutHook.owner()).to.equal(owner.address);
    });

    it("Should reject zero charity address", async function () {
      const OmniCheckoutHookFactory = await ethers.getContractFactory("OmniCheckoutHook");
      await expect(
        OmniCheckoutHookFactory.deploy(
          await mockUSDC.getAddress(),
          ethers.ZeroAddress,
          CHARITY_PERCENTAGE
        )
      ).to.be.revertedWithCustomError(omniCheckoutHook, "InvalidCharityAddress");
    });

    it("Should reject charity percentage > 10%", async function () {
      const OmniCheckoutHookFactory = await ethers.getContractFactory("OmniCheckoutHook");
      await expect(
        OmniCheckoutHookFactory.deploy(
          await mockUSDC.getAddress(),
          charity.address,
          1001 // > 10%
        )
      ).to.be.revertedWithCustomError(omniCheckoutHook, "InvalidPercentage");
    });
  });

  describe("Hook Execution", function () {
    it("Should execute hook and transfer correct amounts", async function () {
      const transferAmount = ethers.parseUnits("100", 6); // 100 USDC (6 decimals)
      const expectedCharityAmount = (transferAmount * BigInt(CHARITY_PERCENTAGE)) / 10000n;
      const expectedRecipientAmount = transferAmount - expectedCharityAmount;

      // Mint USDC to the hook contract
      await mockUSDC.mint(await omniCheckoutHook.getAddress(), transferAmount);

      // Execute hook
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("test message"));
      await omniCheckoutHook.executeHook(recipient.address, transferAmount, messageHash);

      // Check balances
      expect(await mockUSDC.balanceOf(recipient.address)).to.equal(expectedRecipientAmount);
      expect(await mockUSDC.balanceOf(charity.address)).to.equal(expectedCharityAmount);
    });

    it("Should emit HookExecuted event", async function () {
      const transferAmount = ethers.parseUnits("100", 6);
      await mockUSDC.mint(await omniCheckoutHook.getAddress(), transferAmount);

      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("test message"));
      
      await expect(
        omniCheckoutHook.executeHook(recipient.address, transferAmount, messageHash)
      ).to.emit(omniCheckoutHook, "HookExecuted");
    });

    it("Should revert with InsufficientAmount for zero amount", async function () {
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("test message"));
      
      await expect(
        omniCheckoutHook.executeHook(recipient.address, 0, messageHash)
      ).to.be.revertedWithCustomError(omniCheckoutHook, "InsufficientAmount");
    });
  });

  describe("Configuration Updates", function () {
    it("Should allow owner to update charity config", async function () {
      const newPercentage = 500; // 5%
      
      await omniCheckoutHook.updateCharityConfig(otherAccount.address, newPercentage);

      const [charityAddr, percentage] = await omniCheckoutHook.getCharityConfig();
      expect(charityAddr).to.equal(otherAccount.address);
      expect(percentage).to.equal(newPercentage);
    });

    it("Should reject non-owner updates", async function () {
      await expect(
        omniCheckoutHook.connect(charity).updateCharityConfig(otherAccount.address, 500)
      ).to.be.revertedWithCustomError(omniCheckoutHook, "OwnableUnauthorizedAccount");
    });
  });

  describe("Charity Amount Calculation", function () {
    it("Should calculate charity amount correctly", async function () {
      const amount = ethers.parseUnits("100", 6);
      const [charityAmount, recipientAmount] = await omniCheckoutHook.calculateCharityAmount(amount);

      const expectedCharityAmount = (amount * BigInt(CHARITY_PERCENTAGE)) / 10000n;
      const expectedRecipientAmount = amount - expectedCharityAmount;

      expect(charityAmount).to.equal(expectedCharityAmount);
      expect(recipientAmount).to.equal(expectedRecipientAmount);
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to emergency withdraw", async function () {
      const amount = ethers.parseUnits("100", 6);
      await mockUSDC.mint(await omniCheckoutHook.getAddress(), amount);

      const initialOwnerBalance = await mockUSDC.balanceOf(owner.address);
      
      await omniCheckoutHook.emergencyWithdraw(await mockUSDC.getAddress(), amount);

      const finalOwnerBalance = await mockUSDC.balanceOf(owner.address);
      expect(finalOwnerBalance - initialOwnerBalance).to.equal(amount);
    });

    it("Should reject non-owner emergency withdraw", async function () {
      const amount = ethers.parseUnits("100", 6);
      await mockUSDC.mint(await omniCheckoutHook.getAddress(), amount);

      await expect(
        omniCheckoutHook.connect(otherAccount).emergencyWithdraw(await mockUSDC.getAddress(), amount)
      ).to.be.revertedWithCustomError(omniCheckoutHook, "OwnableUnauthorizedAccount");
    });
  });
});
