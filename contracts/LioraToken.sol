// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title LioraToken
 * @author LIORA Protocol Architecture Team
 * @notice Canonical BEP-20 token contract for LIORA COIN on BNB Smart Chain.
 * @dev Conforms to the ERC-20 standard. Extended with OpenZeppelin v5:
 *      - ERC20Burnable: Holders may burn tokens to reduce supply.
 *      - Pausable: Emergency circuit breaker restricted to authorized owner.
 *      - Ownable2Step: Secure two-step ownership management preventing lost admin keys.
 *      
 * Architectural Invariants:
 * 1. Zero fees-on-transfer inside transfer/transferFrom to maintain complete compatibility
 *    with standard Automated Market Makers (PancakeSwap v2/v3), vaults, and cross-chain bridges.
 * 2. No arbitrary post-deployment minting. Initial supply (1,000,000,000 tokens) is minted entirely during construction.
 * 3. Supply: Exactly 1,000,000,000 LIORA with 18 decimals (10^27 atomic units).
 */
contract LioraToken is ERC20, ERC20Burnable, Pausable, Ownable2Step {
    /// @notice Custom error thrown when zero address is provided where a valid address is required.
    error InvalidZeroAddress();

    /// @notice Custom error thrown when initial supply parameter is invalid.
    error InvalidInitialSupply();

    /**
     * @notice Initializes the LIORA COIN token contract.
     * @param initialOwner_ Address assigned as the contract administrator (e.g., Gnosis Safe multisig or deployer).
     */
    constructor(
        address initialOwner_
    ) ERC20("LIORA COIN", "LIORA") Ownable(initialOwner_) {
        if (initialOwner_ == address(0)) {
            revert InvalidZeroAddress();
        }

        // Mint exactly 1,000,000,000 LIORA (18 decimals) to the authorized initial owner
        uint256 initialSupply = 1_000_000_000 * 10 ** 18;
        _mint(initialOwner_, initialSupply);
    }

    /**
     * @notice Returns the standard 18 decimal places.
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /**
     * @notice Triggers emergency circuit breaker to pause transfers.
     * @dev Restricted to the two-step contract owner.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses contract to resume standard token transfers.
     * @dev Restricted to the two-step contract owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Hook that is called before any transfer of tokens.
     *      Enforces the Pausable circuit breaker.
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override whenNotPaused {
        super._update(from, to, value);
    }
}

