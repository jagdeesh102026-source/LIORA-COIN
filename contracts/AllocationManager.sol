// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AllocationManager
 * @author OXENIQ Protocol Architecture Team
 * @notice Manages the 70:30 purchased-token allocation logic for OXENIQ transactions.
 * @dev Kept strictly decoupled from the base BEP-20 token to avoid fee-on-transfer issues on AMMs.
 *      Enforces integer-safe arithmetic:
 *      share70 = (amount * 70) / 100;
 *      share30 = amount - share70;
 *      Guarantees exact conservation: share70 + share30 == amount.
 */
contract AllocationManager is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The OXENIQ token contract
    IERC20 public immutable token;

    /// @notice Recipient wallet for the 70% allocation share
    address public recipient70;

    /// @notice Recipient wallet for the 30% allocation share
    address public recipient30;

    // Events
    event AllocationExecuted(
        address indexed buyer,
        address indexed recipient70,
        address indexed recipient30,
        uint256 amount70,
        uint256 amount30,
        uint256 totalAmount
    );
    event RecipientsUpdated(
        address indexed newRecipient70,
        address indexed newRecipient30
    );

    // Errors
    error InvalidZeroAddress();
    error InvalidZeroAmount();
    error AllocationTransferFailed();

    /**
     * @param tokenAddress_ The address of the deployed OXENIQ token contract.
     * @param initialRecipient70_ Address to receive the 70% allocation.
     * @param initialRecipient30_ Address to receive the 30% allocation.
     * @param initialOwner_ Administrator address for managing allocation configuration.
     */
    constructor(
        address tokenAddress_,
        address initialRecipient70_,
        address initialRecipient30_,
        address initialOwner_
    ) Ownable(initialOwner_) {
        if (tokenAddress_ == address(0) || initialRecipient70_ == address(0) || initialRecipient30_ == address(0) || initialOwner_ == address(0)) {
            revert InvalidZeroAddress();
        }

        token = IERC20(tokenAddress_);
        recipient70 = initialRecipient70_;
        recipient30 = initialRecipient30_;
    }

    /**
     * @notice Pure mathematical calculation of the 70:30 split.
     * @param amount Total amount to split in base token units.
     * @return share70 The primary 70% share (floored).
     * @return share30 The secondary 30% share (exact remainder).
     */
    function calculateSplit(uint256 amount) public pure returns (uint256 share70, uint256 share30) {
        if (amount == 0) {
            return (0, 0);
        }
        share70 = (amount * 70) / 100;
        share30 = amount - share70;
    }

    /**
     * @notice Executes the 70:30 allocation for a token purchase.
     * @dev Caller must have approved this contract to spend at least `amount` of `token`.
     * @param buyer Address of the purchasing entity.
     * @param amount Total quantity of tokens to distribute.
     */
    function executeAllocation(address buyer, uint256 amount) external nonReentrant {
        if (buyer == address(0)) {
            revert InvalidZeroAddress();
        }
        if (amount == 0) {
            revert InvalidZeroAmount();
        }

        (uint256 share70, uint256 share30) = calculateSplit(amount);

        // Pull tokens from the buyer
        token.safeTransferFrom(buyer, address(this), amount);

        // Transfer 70% allocation
        if (share70 > 0) {
            token.safeTransfer(recipient70, share70);
        }

        // Transfer 30% allocation
        if (share30 > 0) {
            token.safeTransfer(recipient30, share30);
        }

        emit AllocationExecuted(buyer, recipient70, recipient30, share70, share30, amount);
    }

    /**
     * @notice Updates the destination recipient addresses for allocations.
     * @dev Restricted to contract owner.
     * @param newRecipient70 New address for the 70% share.
     * @param newRecipient30 New address for the 30% share.
     */
    function updateRecipients(address newRecipient70, address newRecipient30) external onlyOwner {
        if (newRecipient70 == address(0) || newRecipient30 == address(0)) {
            revert InvalidZeroAddress();
        }
        recipient70 = newRecipient70;
        recipient30 = newRecipient30;
        emit RecipientsUpdated(newRecipient70, newRecipient30);
    }
}
