// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title OxeniqToken
 * @author OXENIQ Protocol Architecture Team
 * @notice Core BEP-20 / ERC-20 utility and market-priced token for the OXENIQ ecosystem on BNB Smart Chain.
 * @dev Conforms to the ERC-20 standard. Extended with OpenZeppelin v5:
 *      - ERC20Burnable: Holders may burn tokens to reduce supply.
 *      - Pausable: Emergency circuit breaker restricted to authorized owner.
 *      - Ownable2Step: Secure two-step ownership management preventing lost admin keys.
 *      
 * Architectural Guardrails:
 * 1. Zero fees-on-transfer inside transfer/transferFrom to maintain complete compatibility
 *    with standard Automated Market Makers (PancakeSwap v2/v3), vaults, and cross-chain bridges.
 * 2. No arbitrary post-deployment minting. Initial supply is minted entirely during construction.
 * 3. Supply and allocation parameters remain configurable at deployment time.
 */
contract OxeniqToken is ERC20, ERC20Burnable, Pausable, Ownable2Step {
    /// @notice Custom error thrown when zero address is provided where a valid address is required.
    error InvalidZeroAddress();

    /// @notice Custom error thrown when initial supply parameter is invalid.
    error InvalidInitialSupply();

    /**
     * @notice Initializes the OXENIQ token contract.
     * @param name_ The human-readable name of the token ("OXENIQ").
     * @param symbol_ The ticker symbol of the token ("OXENIQ").
     * @param initialSupply_ Initial total token supply in 18-decimal base units.
     * @param initialOwner_ Address assigned as the contract administrator (e.g., Gnosis Safe multisig).
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_,
        address initialOwner_
    ) ERC20(name_, symbol_) Ownable(initialOwner_) {
        if (initialOwner_ == address(0)) {
            revert InvalidZeroAddress();
        }
        if (initialSupply_ == 0) {
            revert InvalidInitialSupply();
        }

        // Mint initial supply directly to the authorized owner/multisig
        _mint(initialOwner_, initialSupply_);
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
