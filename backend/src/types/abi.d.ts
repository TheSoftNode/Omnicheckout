// Type definitions for ABI JSON files
interface ABIEntry {
  type: string;
  name?: string;
  inputs?: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
  outputs?: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
  stateMutability?: string;
}

declare module "../abis/TokenMessengerV2.json" {
  const value: ABIEntry[];
  export default value;
}

declare module "../abis/MessageTransmitterV2.json" {
  const value: ABIEntry[];
  export default value;
}

declare module "../abis/USDC.json" {
  const value: ABIEntry[];
  export default value;
}
