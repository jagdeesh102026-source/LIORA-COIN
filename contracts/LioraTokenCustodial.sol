// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title LioraTokenCustodial
 * @author LIORA Protocol Architecture Team
 * @notice Authoritative Canonical ERC-20 / BEP-20 token contract for LIORA COIN on BNB Smart Chain.
 * @dev Conforms strictly to standard ERC-20 specification for PancakeSwap AMM and bridge compatibility.
 *
 * Authoritative Revised Supply Requirements:
 * 1. Total Minted Supply at Deployment: Exactly 100,000,000,000 LIORA (100 Billion = 10^29 atomic base units).
 * 2. Operating Treasury Allocation: Exactly 1,000,000,000 LIORA (1 Billion = 10^27 atomic units).
 * 3. Restricted Company Reserve Allocation: Exactly 99,000,000,000 LIORA (99 Billion = 9.9 * 10^28 atomic units).
 * 4. Future Minting: STRICTLY DISABLED. No post-deployment mint function exists; supply is permanently capped.
 * 5. Burn Functionality: Enabled via ERC20Burnable (token holders may burn their own tokens).
 * 6. Standard Transfers & Fractional Transfers: 100% enabled down to 1 wei (10^-18 LIORA), including 0.5 LIORA.
 * 7. 0% Fee-on-Transfer: Full 1:1 conservation for AMM pools, vaults, and router integrations.
 * 8. Non-Upgradeable: Deployed as direct immutable bytecode with no proxy, delegatecall, or UUPS dispatcher.
 */
contract LioraTokenCustodial is ERC20, ERC20Burnable {
    /// @notice Total fixed supply minted at deployment: 100 Billion LIORA (18 decimals)
    uint256 public constant TOTAL_SUPPLY = 100_000_000_000 * 10 ** 18;

    /// @notice Initial allocation to the company operating treasury: 1 Billion LIORA (18 decimals)
    uint256 public constant OPERATING_TREASURY_SUPPLY = 1_000_000_000 * 10 ** 18;

    /// @notice Initial allocation to the restricted company reserve vault: 99 Billion LIORA (18 decimals)
    uint256 public constant RESTRICTED_RESERVE_SUPPLY = 99_000_000_000 * 10 ** 18;

    /// @notice Operating treasury address receiving the 1 Billion LIORA
    address public immutable operatingTreasury;

    /// @notice Separately controlled reserve vault address receiving the 99 Billion LIORA
    address public immutable reserveVault;

    /// @notice Custom error thrown when zero address is provided for treasury or reserve vault.
    error InvalidZeroAddress();

    /// @notice Custom error thrown when treasury and reserve vault addresses are identical.
    error DuplicateAddresses();

    /**
     * @notice Initializes the LIORA token contract, minting the entire 100 Billion fixed supply.
     * @param operatingTreasury_ Authorized address of the company operating treasury (receives 1B LIORA).
     * @param reserveVault_ Authorized address of the restricted reserve vault (receives 99B LIORA).
     */
    constructor(
        address operatingTreasury_,
        address reserveVault_
    ) ERC20("LIORA COIN", "LIORA") {
        if (operatingTreasury_ == address(0) || reserveVault_ == address(0)) {
            revert InvalidZeroAddress();
        }
        if (operatingTreasury_ == reserveVault_) {
            revert DuplicateAddresses();
        }

        operatingTreasury = operatingTreasury_;
        reserveVault = reserveVault_;

        // Mint exactly 1,000,000,000 LIORA to the operating treasury
        _mint(operatingTreasury_, OPERATING_TREASURY_SUPPLY);

        // Mint exactly 99,000,000,000 LIORA to the separately controlled reserve vault
        _mint(reserveVault_, RESTRICTED_RESERVE_SUPPLY);
    }

    /**
     * @notice Returns standard 18 decimal places.
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
