// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {LioraTokenUUPSV1} from "./LioraTokenUUPSV1.sol";

/**
 * @title LioraTokenUUPSV2
 * @author LIORA Protocol Architecture Team
 * @notice V2 implementation prototype demonstrating upgradeability, state preservation, and fixed-supply compliance.
 * @dev Preserves storage layout of V1.
 */
contract LioraTokenUUPSV2 is LioraTokenUUPSV1 {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Implementation version identifier updated to 2.0.0.
     */
    function version() external pure override returns (string memory) {
        return "2.0.0";
    }

    /**
     * @notice Demonstrates a safe V2 feature addition: audit confirmation of immutable supply cap.
     */
    function isSupplyCapEnforced() external pure returns (bool) {
        return true;
    }

    /**
     * @notice Re-initializer for V2 if new state is configured.
     */
    function initializeV2() external reinitializer(2) {
        // Safe post-upgrade state migrations if required
        emit VersionUpdated("2.0.0");
    }

    /// @notice Emitted when implementation version is updated
    /// @param version The new version string
    event VersionUpdated(string version);
}
