// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TestnetTokenSale
 * @author OXENIQ Protocol Architecture Team
 * @notice Dedicated, standalone testnet-only fixed-price sale contract for OXENIQ tokens on BNB Smart Chain Testnet.
 * @dev Strictly restricted to BSC Testnet (Chain ID 97) and Local Simulation (Chain ID 31337).
 *      Execution on BSC Mainnet (Chain ID 56) or any other network is strictly prohibited at the bytecode level.
 *
 * Architectural Guardrails:
 * 1. Testnet Sandbox Only: Accepts only test BNB (tBNB) with zero real-world economic value.
 * 2. Fixed Test Rate: 1 tBNB = 10,000 OXENIQ (both using 18 decimals, giving exact integer arithmetic).
 * 3. Inventory Bound: Contract has no minting power. It can only sell tokens transferred to its address.
 * 4. Fails Closed: Reverts if payment is zero, or if requested tokens exceed available inventory.
 * 5. Safe Recovery: Contract owner can safely withdraw unsold tokens or accrued test proceeds.
 */
contract TestnetTokenSale is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Permitted testnet chain ID (BNB Smart Chain Testnet)
    uint256 public constant BSC_TESTNET_CHAIN_ID = 97;

    /// @notice Permitted local developer testing chain ID (Hardhat Network)
    uint256 public constant LOCAL_DEVNET_CHAIN_ID = 31337;

    /// @notice Fixed test rate: 1 tBNB buys 10,000 OXENIQ tokens
    uint256 public constant TOKENS_PER_BNB = 10_000;

    /// @notice The deployed OXENIQ ERC-20 / BEP-20 token contract
    IERC20 public immutable token;

    // Events
    event TokensPurchased(
        address indexed buyer,
        address indexed recipient,
        uint256 bnbPaid,
        uint256 tokensDelivered
    );
    event UnsoldTokensWithdrawn(address indexed owner, uint256 amount);
    event BnbProceedsWithdrawn(address indexed owner, uint256 amount);

    // Custom Errors
    error UnsupportedNetwork(uint256 currentChainId, uint256 requiredChainId);
    error InvalidZeroAddress();
    error ZeroPayment();
    error InsufficientInventory(uint256 availableTokens, uint256 requiredTokens);
    error InsufficientBnbBalance();
    error NativeTransferFailed();

    /**
     * @notice Initializes the testnet-only sale contract.
     * @param tokenAddress_ The address of the deployed OXENIQ token contract.
     * @param initialOwner_ Address assigned as contract administrator (deployer or multisig).
     */
    constructor(
        address tokenAddress_,
        address initialOwner_
    ) Ownable(initialOwner_) {
        // Enforce network isolation: only BSC Testnet (97) or Local Devnet (31337)
        if (block.chainid != BSC_TESTNET_CHAIN_ID && block.chainid != LOCAL_DEVNET_CHAIN_ID) {
            revert UnsupportedNetwork(block.chainid, BSC_TESTNET_CHAIN_ID);
        }

        if (tokenAddress_ == address(0) || initialOwner_ == address(0)) {
            revert InvalidZeroAddress();
        }

        token = IERC20(tokenAddress_);
    }

    /**
     * @notice Purchases OXENIQ tokens with testnet BNB (tBNB) at the fixed test rate.
     * @dev Enforces whenNotPaused, nonReentrant, valid network, positive payment, and sufficient inventory.
     * @param recipient The address receiving the purchased OXENIQ tokens.
     */
    function buyTokens(address recipient) public payable whenNotPaused nonReentrant {
        // Enforce network check at runtime as well
        if (block.chainid != BSC_TESTNET_CHAIN_ID && block.chainid != LOCAL_DEVNET_CHAIN_ID) {
            revert UnsupportedNetwork(block.chainid, BSC_TESTNET_CHAIN_ID);
        }

        if (recipient == address(0)) {
            revert InvalidZeroAddress();
        }

        if (msg.value == 0) {
            revert ZeroPayment();
        }

        // Exact integer calculation: both BNB and OXENIQ have 18 decimals
        // 1 wei * 10,000 = 10,000 base units
        uint256 tokensToDeliver = msg.value * TOKENS_PER_BNB;

        uint256 availableInventory = token.balanceOf(address(this));
        if (availableInventory < tokensToDeliver) {
            revert InsufficientInventory(availableInventory, tokensToDeliver);
        }

        // Transfer tokens to the recipient
        token.safeTransfer(recipient, tokensToDeliver);

        emit TokensPurchased(msg.sender, recipient, msg.value, tokensToDeliver);
    }

    /**
     * @notice Fallback receive function to purchase tokens directly on native tBNB transfer.
     */
    receive() external payable {
        buyTokens(msg.sender);
    }

    /**
     * @notice Helper to calculate the token amount for a given tBNB amount in wei.
     * @param bnbAmountWei Amount of tBNB in wei (10^-18).
     * @return tokenAmount Number of base units (10^-18) of OXENIQ delivered.
     */
    function calculateTokenAmount(uint256 bnbAmountWei) external pure returns (uint256 tokenAmount) {
        return bnbAmountWei * TOKENS_PER_BNB;
    }

    /**
     * @notice Returns the live available OXENIQ inventory held by the sale contract.
     */
    function getAvailableInventory() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @notice Pauses token purchases in emergency situations.
     * @dev Restricted to the contract owner.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses token purchases.
     * @dev Restricted to the contract owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Allows the contract owner to safely reclaim unsold test inventory.
     * @param amount Quantity of OXENIQ base units to withdraw.
     */
    function withdrawUnsoldTokens(uint256 amount) external onlyOwner nonReentrant {
        uint256 available = token.balanceOf(address(this));
        if (available < amount) {
            revert InsufficientInventory(available, amount);
        }
        token.safeTransfer(owner(), amount);
        emit UnsoldTokensWithdrawn(owner(), amount);
    }

    /**
     * @notice Allows the contract owner to safely withdraw accumulated testnet BNB proceeds.
     */
    function withdrawBnb() external onlyOwner nonReentrant {
        uint256 bnbBalance = address(this).balance;
        if (bnbBalance == 0) {
            revert InsufficientBnbBalance();
        }

        (bool success, ) = payable(owner()).call{value: bnbBalance}("");
        if (!success) {
            revert NativeTransferFailed();
        }

        emit BnbProceedsWithdrawn(owner(), bnbBalance);
    }
}
