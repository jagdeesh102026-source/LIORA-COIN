// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title MockUSDT
 * @author LIORA Protocol Architecture Team
 * @notice Clearly labeled testnet sandbox token representing a 1:1 USD accounting reference.
 * @dev STRICTLY FOR BSC TESTNET AND LOCAL SIMULATION SANDBOX TESTING.
 *      Never represents real Tether USD, production stablecoins, or redeemable fiat value.
 *      Used exclusively to fund and test the LIORA/USDT PancakeSwap V2 testnet liquidity pool.
 */
contract MockUSDT is ERC20, Ownable2Step {
    error InvalidZeroAddress();

    /**
     * @notice Initializes the Mock USDT testnet token.
     * @param initialOwner_ Address assigned as administrator and faucet distributor.
     */
    constructor(
        address initialOwner_
    ) ERC20("Mock Tether USD (Testnet Sandbox)", "mUSDT") Ownable(initialOwner_) {
        if (initialOwner_ == address(0)) {
            revert InvalidZeroAddress();
        }

        // Mint initial test supply of 1,000,000 mUSDT to deployer for sandbox pool funding
        uint256 initialSupply = 1_000_000 * 10 ** 18;
        _mint(initialOwner_, initialSupply);
    }

    /**
     * @notice Standard 18 decimals matching BSC-USD (Binance-Peg Tether on BSC).
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /**
     * @notice Allows owner to mint testnet tokens for automated sandbox testing.
     * @param recipient Address receiving test tokens.
     * @param amount Token amount in 18-decimal base units.
     */
    function mint(address recipient, uint256 amount) external onlyOwner {
        if (recipient == address(0)) {
            revert InvalidZeroAddress();
        }
        _mint(recipient, amount);
    }
}

