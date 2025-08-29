// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ICCTP_V2_Hook
 * @notice Interface for CCTP V2 hook contracts
 * @dev Hooks are executed after USDC minting on the destination chain
 */
interface ICCTP_V2_Hook {
    /**
     * @notice Execute hook logic
     * @param recipient The intended recipient of the minted USDC
     * @param amount The amount of USDC minted
     * @param messageHash The hash of the CCTP message
     * @param hookData Additional data passed from the burn transaction
     */
    function executeHook(
        address recipient,
        uint256 amount,
        bytes32 messageHash,
        bytes calldata hookData
    ) external;
}

/**
 * @title ICCTP_V2_MessageTransmitter
 * @notice Interface for CCTP V2 MessageTransmitter contract
 */
interface ICCTP_V2_MessageTransmitter {
    /**
     * @notice Receive a message from another domain
     * @param message The message bytes
     * @param attestation The attestation signature
     */
    function receiveMessage(
        bytes calldata message,
        bytes calldata attestation
    ) external returns (bool);

    /**
     * @notice Check if a message has been received
     * @param messageHash The hash of the message
     */
    function usedNonces(bytes32 messageHash) external view returns (bool);
}

/**
 * @title ICCTP_V2_TokenMessenger
 * @notice Interface for CCTP V2 TokenMessenger contract
 */
interface ICCTP_V2_TokenMessenger {
    /**
     * @notice Deposit and burn tokens to mint on destination domain
     * @param amount Amount of tokens to burn
     * @param destinationDomain Destination domain identifier
     * @param mintRecipient Recipient address on destination domain
     * @param burnToken Address of token to burn
     * @param hookData Data to pass to hook on destination
     * @param maxFee Maximum fee to pay on destination
     * @param finalityThreshold Finality threshold for attestation
     */
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 hookData,
        uint256 maxFee,
        uint32 finalityThreshold
    ) external returns (uint64);
}
