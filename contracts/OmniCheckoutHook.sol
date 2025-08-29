// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OmniCheckoutHook
 * @notice CCTP V2 Hook contract for OmniCheckout that implements charity donations
 * @dev This contract demonstrates the use of CCTP V2 hooks to automatically
 *      route a percentage of each payment to a charity address
 */
contract OmniCheckoutHook is ReentrancyGuard, Ownable {
    IERC20 public immutable USDC;

    // Charity configuration
    address public charityAddress;
    uint256 public charityPercentage; // Basis points (100 = 1%)

    // Events
    event CharityDonationSent(
        address indexed donor,
        address indexed charity,
        uint256 amount,
        uint256 totalTransfer
    );

    event CharityConfigUpdated(
        address indexed newCharity,
        uint256 newPercentage
    );

    event HookExecuted(
        bytes32 indexed messageHash,
        address indexed recipient,
        uint256 amount,
        uint256 charityAmount
    );

    // Errors
    error InvalidCharityAddress();
    error InvalidPercentage();
    error InsufficientAmount();
    error TransferFailed();

    constructor(
        address _usdc,
        address _charityAddress,
        uint256 _charityPercentage
    ) Ownable(msg.sender) {
        if (_usdc == address(0)) revert InvalidCharityAddress();
        if (_charityAddress == address(0)) revert InvalidCharityAddress();
        if (_charityPercentage > 1000) revert InvalidPercentage(); // Max 10%

        USDC = IERC20(_usdc);
        charityAddress = _charityAddress;
        charityPercentage = _charityPercentage;
    }

    /**
     * @notice Execute hook logic when USDC is minted via CCTP
     * @dev This function is called by the CCTP MessageTransmitter after minting
     * @param recipient The intended recipient of the USDC
     * @param amount The total amount of USDC minted
     * @param messageHash The hash of the CCTP message
     */
    function executeHook(
        address recipient,
        uint256 amount,
        bytes32 messageHash
    ) external nonReentrant {
        if (amount == 0) revert InsufficientAmount();

        // Calculate charity donation
        uint256 charityAmount = (amount * charityPercentage) / 10000;
        uint256 recipientAmount = amount - charityAmount;

        // Transfer main amount to recipient
        if (recipientAmount > 0) {
            bool success = USDC.transfer(recipient, recipientAmount);
            if (!success) revert TransferFailed();
        }

        // Transfer charity amount if applicable
        if (charityAmount > 0 && charityAddress != address(0)) {
            bool success = USDC.transfer(charityAddress, charityAmount);
            if (!success) revert TransferFailed();

            emit CharityDonationSent(
                recipient,
                charityAddress,
                charityAmount,
                amount
            );
        }

        emit HookExecuted(
            messageHash,
            recipient,
            recipientAmount,
            charityAmount
        );
    }

    /**
     * @notice Update charity configuration
     * @param _charityAddress New charity address
     * @param _charityPercentage New charity percentage in basis points
     */
    function updateCharityConfig(
        address _charityAddress,
        uint256 _charityPercentage
    ) external onlyOwner {
        if (_charityAddress == address(0)) revert InvalidCharityAddress();
        if (_charityPercentage > 1000) revert InvalidPercentage(); // Max 10%

        charityAddress = _charityAddress;
        charityPercentage = _charityPercentage;

        emit CharityConfigUpdated(_charityAddress, _charityPercentage);
    }

    /**
     * @notice Emergency withdraw function
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }

    /**
     * @notice Get charity configuration
     * @return charity The charity address
     * @return percentage The charity percentage in basis points
     */
    function getCharityConfig()
        external
        view
        returns (address charity, uint256 percentage)
    {
        return (charityAddress, charityPercentage);
    }

    /**
     * @notice Calculate charity amount for a given transfer
     * @param amount The total transfer amount
     * @return charityAmount The amount that would go to charity
     * @return recipientAmount The amount that would go to recipient
     */
    function calculateCharityAmount(
        uint256 amount
    ) external view returns (uint256 charityAmount, uint256 recipientAmount) {
        charityAmount = (amount * charityPercentage) / 10000;
        recipientAmount = amount - charityAmount;
    }
}
