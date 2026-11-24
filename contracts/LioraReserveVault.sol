// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title LioraReserveVault
 * @author LIORA Protocol Architecture Team
 * @notice Separately controlled restricted company reserve vault holding 99,000,000,000 LIORA.
 * @dev Enforces strict authorization controls preventing token release without explicitly
 *      configured multi-signature / two-step ownership governance approval.
 *
 * Invariants:
 * 1. Restricted Custody: Holds the 99 Billion LIORA restricted company reserve.
 * 2. Immutable Token Binding: Bound to the canonical LIORA token contract.
 * 3. Two-Step Authorization: Only the authorized reserve governance owner (e.g. Gnosis Safe multi-sig)
 *    can authorize token releases.
 * 4. Audit Trail: Every release requires a documented purpose and emits an auditable event.
 * 5. Rejection of Zero Address / Excessive Withdrawals.
 */
contract LioraReserveVault is Ownable2Step {
    using SafeERC20 for IERC20;

    /// @notice Address of the canonical LIORA ERC-20 token
    IERC20 public token;

    /// @notice Custom error thrown when zero address is provided.
    error InvalidZeroAddress();

    /// @notice Custom error thrown when release amount is zero.
    error InvalidAmount();

    /// @notice Custom error thrown when requested release exceeds vault balance.
    error InsufficientVaultBalance(uint256 requested, uint256 available);

    /// @notice Custom error thrown when token is already initialized.
    error TokenAlreadySet();

    /// @notice Event emitted when reserve tokens are released by authorized governance.
    event ReserveTokensReleased(
        address indexed recipient,
        uint256 amount,
        string purpose,
        uint256 timestamp
    );

    /// @notice Event emitted when token address is bound to the vault.
    event TokenSet(address indexed tokenAddress);

    /**
     * @notice Initializes the Reserve Vault with the designated reserve governance administrator.
     * @param initialGovernance_ Multi-sig or governance administrator controlling reserve releases.
     */
    constructor(address initialGovernance_) Ownable(initialGovernance_) {
        if (initialGovernance_ == address(0)) {
            revert InvalidZeroAddress();
        }
    }

    /**
     * @notice Binds the canonical LIORA token address to the vault. Can only be set once.
     * @param token_ Address of the deployed LIORA token contract.
     */
    function setToken(address token_) external onlyOwner {
        if (address(token) != address(0)) {
            revert TokenAlreadySet();
        }
        if (token_ == address(0)) {
            revert InvalidZeroAddress();
        }
        token = IERC20(token_);
        emit TokenSet(token_);
    }

    /**
     * @notice Releases reserve tokens to an approved destination for an authorized operational purpose.
     * @dev Restricted strictly to the two-step reserve governance owner.
     * @param recipient Authorized destination address.
     * @param amount Token amount to release in atomic units (18 decimals).
     * @param purpose Documented governance reason for the release.
     */
    function releaseReserveTokens(
        address recipient,
        uint256 amount,
        string calldata purpose
    ) external onlyOwner {
        if (recipient == address(0)) {
            revert InvalidZeroAddress();
        }
        if (amount == 0) {
            revert InvalidAmount();
        }
        if (address(token) == address(0)) {
            revert InvalidZeroAddress();
        }

        uint256 currentBalance = token.balanceOf(address(this));
        if (amount > currentBalance) {
            revert InsufficientVaultBalance(amount, currentBalance);
        }

        token.safeTransfer(recipient, amount);
        emit ReserveTokensReleased(recipient, amount, purpose, block.timestamp);
    }

    /**
     * @notice Returns the current reserve balance held in the vault.
     */
    function getReserveBalance() external view returns (uint256) {
        if (address(token) == address(0)) {
            return 0;
        }
        return token.balanceOf(address(this));
    }
}
