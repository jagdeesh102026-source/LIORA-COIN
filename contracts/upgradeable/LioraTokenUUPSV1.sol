// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title LioraTokenUUPSV1
 * @author LIORA Protocol Architecture Team
 * @notice UUPS Upgradeable implementation prototype of LIORA COIN for Mainnet architecture evaluation.
 * @dev Retains identical supply parameters, 18 decimals, zero transfer fees, and fixed 100B cap.
 *
 * Requirements enforced:
 * 1. Initial supply (100 Billion) minted exactly once during proxy initialization.
 * 2. Implementation contract initializers permanently disabled in constructor.
 * 3. Upgrades restricted exclusively to corporate governance via UPGRADER_ROLE.
 * 4. ERC-20 transfers, burns, fractional transfers, and zero transfer fees preserved.
 * 5. No post-initialization minting function exists.
 */
contract LioraTokenUUPSV1 is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    /// @notice Role authorized to authorize UUPS implementation upgrades
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @notice Total fixed supply minted at initialization: 100 Billion LIORA (18 decimals)
    uint256 public constant TOTAL_SUPPLY_CAP = 100_000_000_000 * 10 ** 18;

    /// @notice Initial allocation to the company operating treasury: 1 Billion LIORA (18 decimals)
    uint256 public constant OPERATING_TREASURY_SUPPLY = 1_000_000_000 * 10 ** 18;

    /// @notice Initial allocation to the restricted company reserve vault: 99 Billion LIORA (18 decimals)
    uint256 public constant RESTRICTED_RESERVE_SUPPLY = 99_000_000_000 * 10 ** 18;

    /// @notice Operating treasury address receiving the 1 Billion LIORA
    address public operatingTreasury;

    /// @notice Separately controlled reserve vault address receiving the 99 Billion LIORA
    address public reserveVault;

    /// @notice Custom error thrown when zero address is provided
    error InvalidZeroAddress();

    /// @notice Custom error thrown when treasury and reserve vault addresses are identical
    error DuplicateAddresses();

    /// @notice Custom error thrown if post-initialization supply exceeds 100B
    error SupplyCapExceeded();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        // Requirement 3: Permanently lock implementation contract from being initialized
        _disableInitializers();
    }

    /**
     * @notice Proxy initializer function — executable exactly once.
     * @param operatingTreasury_ Authorized address of operating treasury (receives 1B LIORA).
     * @param reserveVault_ Authorized address of restricted reserve vault (receives 99B LIORA).
     * @param corporateGovernance_ Authorized corporate governance address (e.g. Timelock / Safe multisig).
     */
    function initialize(
        address operatingTreasury_,
        address reserveVault_,
        address corporateGovernance_
    ) public virtual initializer {
        if (
            operatingTreasury_ == address(0) ||
            reserveVault_ == address(0) ||
            corporateGovernance_ == address(0)
        ) {
            revert InvalidZeroAddress();
        }
        if (operatingTreasury_ == reserveVault_) {
            revert DuplicateAddresses();
        }

        // Initialize parent upgradeable contracts with confirmed name and symbol: LIORA
        __ERC20_init("LIORA", "LIORA");
        __ERC20Burnable_init();
        __AccessControl_init();

        // Assign administrative and upgrader roles to corporate governance
        _grantRole(DEFAULT_ADMIN_ROLE, corporateGovernance_);
        _grantRole(UPGRADER_ROLE, corporateGovernance_);

        operatingTreasury = operatingTreasury_;
        reserveVault = reserveVault_;

        // Mint exactly 1 Billion to Operating Treasury
        _mint(operatingTreasury_, OPERATING_TREASURY_SUPPLY);

        // Mint exactly 99 Billion to Reserve Vault
        _mint(reserveVault_, RESTRICTED_RESERVE_SUPPLY);
    }

    /**
     * @notice Returns standard 18 decimal places.
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /**
     * @notice Implementation version identifier.
     */
    function version() external pure virtual returns (string memory) {
        return "1.0.0";
    }

    /**
     * @notice Authorizes an upgrade to a new implementation.
     * @dev Restricts implementation upgrades strictly to UPGRADER_ROLE holders.
     * @param newImplementation Address of the newly deployed implementation.
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {
        if (newImplementation == address(0)) {
            revert InvalidZeroAddress();
        }
    }

    /**
     * @dev Reserved storage space to allow for future variable additions without storage collisions.
     */
    uint256[48] private __gap;
}
