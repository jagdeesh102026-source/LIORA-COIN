// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title LioraTokenImmutable
 * @author LIORA Protocol Architecture Team
 * @notice Canonical, immutable BEP-20 token contract for LIORA COIN on BNB Smart Chain.
 * @dev Conforms to the standard ERC-20 specification. Extended with OpenZeppelin v5:
 *      - ERC20Burnable: Token holders may burn their own tokens to verifiably reduce supply.
 *
 * Authoritative Management Requirements (Q17, Q20, Q21):
 * 1. Fixed Supply: Exactly 1,000,000,000 LIORA with 18 decimals (10^27 atomic base units).
 * 2. Zero Post-Deployment Minting: Complete supply is minted during construction to the initial holder.
 * 3. Zero Privileged Controls: No owner, no administrator, no governance keys over user tokens.
 * 4. Zero Emergency Pause: Transfers cannot be paused, frozen, or intercepted by any party.
 * 5. Zero Transfer Restrictions: No blacklists, whitelists, anti-whale caps, or time gates.
 * 6. Zero Transaction Fees: 0% fee-on-transfer; transfer(a, b, x) results in exact conservation.
 * 7. Non-Upgradeable: Deployed as direct bytecode with no proxy, UUPS, Beacon, or delegatecall dispatcher.
 */
contract LioraTokenImmutable is ERC20, ERC20Burnable {
    /// @notice Custom error thrown when zero address is provided as initial holder.
    error InvalidZeroAddress();

    /**
     * @notice Initializes the immutable LIORA COIN token contract.
     * @param initialHolder Address receiving the entire initial 1 Billion token supply.
     */
    constructor(address initialHolder) ERC20("LIORA COIN", "LIORA") {
        if (initialHolder == address(0)) {
            revert InvalidZeroAddress();
        }

        // Mint exactly 1,000,000,000 LIORA (18 decimals) to the initial holder
        _mint(initialHolder, 1_000_000_000 * 10 ** 18);
    }

    /**
     * @notice Returns the standard 18 decimal places.
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
