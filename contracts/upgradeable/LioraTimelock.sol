// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title LioraTimelock
 * @author LIORA Protocol Architecture Team
 * @notice Corporate Timelock Controller for LIORA UUPS Upgrade Governance.
 * @dev Enforces a mandatory time delay on corporate actions including UUPS implementation upgrades.
 */
contract LioraTimelock is TimelockController {
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
}
