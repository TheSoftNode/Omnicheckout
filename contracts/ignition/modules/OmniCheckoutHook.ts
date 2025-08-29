import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const OmniCheckoutHookModule = buildModule("OmniCheckoutHook", (m) => {
  // Parameters that can be overridden during deployment
  const usdc = m.getParameter("usdc", "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"); // Default to Sepolia USDC
  const charityAddress = m.getParameter("charityAddress", "0x0000000000000000000000000000000000000000");
  const charityPercentage = m.getParameter("charityPercentage", 250); // 2.5% default

  // Deploy the OmniCheckoutHook contract
  const omniCheckoutHook = m.contract("OmniCheckoutHook", [
    usdc,
    charityAddress,
    charityPercentage,
  ]);

  return { omniCheckoutHook };
});

export default OmniCheckoutHookModule;
