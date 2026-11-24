/**
 * LIORA COIN — Decentralized Exchange (DEX) Proof-of-Concept Service
 *
 * Implements non-custodial automated market maker (AMM) routing, pool discovery,
 * exact constant-product swap calculations (PancakeSwap V2 / V3 compatible),
 * slippage protection, price impact analytics, safe exact-amount approval checks,
 * and testnet execution safeguards.
 *
 * Strictly restricted to BSC Testnet (#97) and Local Simulation Devnet (#31337).
 * Mainnet pool creation and transactions are strictly prohibited.
 */

import { formatUnits, parseUnits, Address } from 'viem';
import {
  TokenInfo,
  PoolReserves,
  DexQuoteRequest,
  DexQuoteResult,
  DexSwapParams,
  DexSwapSimulationResult,
  DexSwapExecutionReceipt,
  LiquidityProvisionQuote,
  LiquidityRemovalQuote,
  TradeStressResult,
  LiquidityRemovalStressResult,
  LiquidityStressTestResult
} from './dexTypes';

export const PANCAKESWAP_V2_FACTORY_TESTNET = '0x6725F303b657a9451d8BA641348b6761A6CC7a17';
export const PANCAKESWAP_V2_ROUTER_TESTNET = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';
export const TESTNET_WBNB_ADDRESS = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd';

// Verified On-Chain Deployments (UUPS Upgradeable Active Pool)
export const TESTNET_LIORA_TOKEN_ADDRESS = '0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9'; // UUPS Proxy
export const TESTNET_MOCK_USDT_ADDRESS = '0x0b419a33e8a6448547906DCB191b037Db5ac926e';
export const TESTNET_USDT_ADDRESS = TESTNET_MOCK_USDT_ADDRESS;
export const TESTNET_LIORA_USDT_PAIR_ADDRESS = '0xcCb0C6bDFe9dbc77c3275ad34C6F33aF05197D96'; // UUPS Pair
export const TESTNET_LEGACY_LIORA_USDT_PAIR_ADDRESS = '0x64beE3847a766D35E6611985F3c3e51C78Af5D2c';

export const PERMITTED_CHAIN_IDS = [97, 31337];
export const PROHIBITED_CHAIN_IDS = [56, 1]; // BSC Mainnet & Ethereum Mainnet

export class DexService {
  public readonly chainId: number;
  public readonly routerAddress: string;
  public readonly factoryAddress: string;

  constructor(
    chainId: number = 97,
    routerAddress: string = PANCAKESWAP_V2_ROUTER_TESTNET,
    factoryAddress: string = PANCAKESWAP_V2_FACTORY_TESTNET
  ) {
    if (PROHIBITED_CHAIN_IDS.includes(chainId)) {
      throw new Error(`SECURITY ERROR: Mainnet chain ID ${chainId} is strictly prohibited in DEX sandbox.`);
    }
    if (!PERMITTED_CHAIN_IDS.includes(chainId)) {
      throw new Error(`Unsupported network chain ID ${chainId}. Only BSC Testnet (#97) and Local Devnet (#31337) are allowed.`);
    }
    this.chainId = chainId;
    this.routerAddress = routerAddress;
    this.factoryAddress = factoryAddress;
  }

  /**
   * Asserts that an address is a valid EVM address format.
   */
  public static validateAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Exact integer PancakeSwap V2 constant product formula with 0.25% fee (25 basis points).
   * Formula:
   *   amountInWithFee = amountIn * 9975
   *   numerator = amountInWithFee * reserveOut
   *   denominator = (reserveIn * 10000) + amountInWithFee
   *   amountOut = numerator / denominator
   */
  public static calculateAmountOut(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint
  ): bigint {
    if (amountIn <= 0n) {
      throw new Error('INSUFFICIENT_INPUT_AMOUNT: Input amount must be strictly positive');
    }
    if (reserveIn <= 0n || reserveOut <= 0n) {
      throw new Error('INSUFFICIENT_LIQUIDITY: Reserves must be strictly positive');
    }

    const amountInWithFee = amountIn * 9975n;
    const numerator = amountInWithFee * reserveOut;
    const denominator = (reserveIn * 10000n) + amountInWithFee;
    return numerator / denominator;
  }

  /**
   * Calculates minimum received amount based on slippage tolerance.
   * e.g., slippagePercent = 0.5% -> slippageBps = 50 -> multiplier = (10000 - 50) / 10000
   */
  public static calculateMinimumReceived(
    amountOut: bigint,
    slippageTolerancePercent: number
  ): bigint {
    if (slippageTolerancePercent < 0 || slippageTolerancePercent > 50) {
      throw new Error('INVALID_SLIPPAGE: Slippage tolerance must be between 0.01% and 50%');
    }
    const slippageBps = BigInt(Math.round(slippageTolerancePercent * 100));
    return (amountOut * (10000n - slippageBps)) / 10000n;
  }

  /**
   * Calculates spot price (unimpacted marginal rate) and price impact.
   * Spot Price = reserveOut / reserveIn
   * Price Impact = (spotPrice - executionPrice) / spotPrice
   */
  public static calculatePriceImpact(
    amountIn: bigint,
    amountOut: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    decimalsIn: number = 18,
    decimalsOut: number = 18
  ): { spotPrice: number; effectiveExecutionPrice: number; priceImpactPercent: number } {
    const numReserveIn = parseFloat(formatUnits(reserveIn, decimalsIn));
    const numReserveOut = parseFloat(formatUnits(reserveOut, decimalsOut));
    const numAmountIn = parseFloat(formatUnits(amountIn, decimalsIn));
    const numAmountOut = parseFloat(formatUnits(amountOut, decimalsOut));

    if (numReserveIn <= 0 || numAmountIn <= 0) {
      return { spotPrice: 0, effectiveExecutionPrice: 0, priceImpactPercent: 0 };
    }

    const spotPrice = numReserveOut / numReserveIn;
    const effectiveExecutionPrice = numAmountOut / numAmountIn;

    // Price impact reflects degradation from spot price
    const priceImpactRatio = spotPrice > 0 ? (spotPrice - effectiveExecutionPrice) / spotPrice : 0;
    const priceImpactPercent = Math.max(0, priceImpactRatio * 100);

    return {
      spotPrice: Number(spotPrice.toFixed(8)),
      effectiveExecutionPrice: Number(effectiveExecutionPrice.toFixed(8)),
      priceImpactPercent: Number(priceImpactPercent.toFixed(4)),
    };
  }

  /**
   * Generates a comprehensive DEX swap quote for a given pair and reserves.
   */
  public getExecutableQuote(
    request: DexQuoteRequest,
    reserves: PoolReserves
  ): DexQuoteResult {
    const { tokenIn, tokenOut, slippageTolerancePercent } = request;
    const warnings: string[] = [];

    // Parse amountIn into base units
    const amountInBaseUnits =
      typeof request.amountIn === 'bigint'
        ? request.amountIn
        : parseUnits(request.amountIn, tokenIn.decimals);

    if (amountInBaseUnits <= 0n) {
      throw new Error('SWAP_QUOTE_ERROR: Investment amount must be strictly greater than zero.');
    }

    // Determine reserve orientation
    const isToken0In = tokenIn.address.toLowerCase() === reserves.token0.toLowerCase();
    const reserveIn = isToken0In ? reserves.reserve0 : reserves.reserve1;
    const reserveOut = isToken0In ? reserves.reserve1 : reserves.reserve0;

    // Check liquidity presence
    const hasSufficientLiquidity =
      reserves.hasLiquidity && reserveIn > 0n && reserveOut > 0n && reserveOut > amountInBaseUnits / 1000n;

    if (!hasSufficientLiquidity) {
      warnings.push('CRITICAL: Insufficient pool liquidity. Trade cannot be executed without extreme slippage or revert.');
      return {
        tokenIn,
        tokenOut,
        amountInBaseUnits,
        amountInFormatted: formatUnits(amountInBaseUnits, tokenIn.decimals),
        expectedAmountOutBaseUnits: 0n,
        expectedAmountOutFormatted: '0.00',
        minAmountOutBaseUnits: 0n,
        minAmountOutFormatted: '0.00',
        spotPrice: 0,
        effectiveExecutionPrice: 0,
        priceImpactPercent: 100.0,
        slippageTolerancePercent,
        feeBaseUnits: 0n,
        feeFormatted: '0.00',
        feePercent: 0.25,
        routerAddress: this.routerAddress,
        factoryAddress: this.factoryAddress,
        pairAddress: reserves.pairAddress || null,
        route: [tokenIn.symbol, tokenOut.symbol],
        estimatedGasUnits: 0n,
        estimatedGasCostBnb: '0.00',
        estimatedGasCostUsd: 0.0,
        hasSufficientLiquidity: false,
        warnings,
      };
    }

    // Exact output calculation
    const expectedAmountOutBaseUnits = DexService.calculateAmountOut(
      amountInBaseUnits,
      reserveIn,
      reserveOut
    );

    // Slippage protection minimum
    const minAmountOutBaseUnits = DexService.calculateMinimumReceived(
      expectedAmountOutBaseUnits,
      slippageTolerancePercent
    );

    // Fee calculation (0.25% PancakeSwap V2 fee)
    const feeBaseUnits = (amountInBaseUnits * 25n) / 10000n;

    // Price impact & rates
    const { spotPrice, effectiveExecutionPrice, priceImpactPercent } =
      DexService.calculatePriceImpact(
        amountInBaseUnits,
        expectedAmountOutBaseUnits,
        reserveIn,
        reserveOut,
        tokenIn.decimals,
        tokenOut.decimals
      );

    if (priceImpactPercent > 5.0) {
      warnings.push(`HIGH PRICE IMPACT WARNING: Swap causes ${priceImpactPercent.toFixed(2)}% price impact on shallow liquidity.`);
    }
    if (priceImpactPercent > 15.0) {
      warnings.push('CRITICAL: Extreme price impact exceeds 15%. Trade is highly susceptible to sandwich attacks and severe value loss.');
    }

    // Standard BSC swap gas parameters (135,000 gas units, 3 Gwei)
    const estimatedGasUnits = 135000n;
    const gasPriceGwei = 3n;
    const gasCostWei = estimatedGasUnits * gasPriceGwei * 10n ** 9n;
    const estimatedGasCostBnb = formatUnits(gasCostWei, 18);
    const estimatedGasCostUsd = parseFloat(estimatedGasCostBnb) * 620; // benchmark BNB price

    return {
      tokenIn,
      tokenOut,
      amountInBaseUnits,
      amountInFormatted: formatUnits(amountInBaseUnits, tokenIn.decimals),
      expectedAmountOutBaseUnits,
      expectedAmountOutFormatted: formatUnits(expectedAmountOutBaseUnits, tokenOut.decimals),
      minAmountOutBaseUnits,
      minAmountOutFormatted: formatUnits(minAmountOutBaseUnits, tokenOut.decimals),
      spotPrice,
      effectiveExecutionPrice,
      priceImpactPercent,
      slippageTolerancePercent,
      feeBaseUnits,
      feeFormatted: formatUnits(feeBaseUnits, tokenIn.decimals),
      feePercent: 0.25,
      routerAddress: this.routerAddress,
      factoryAddress: this.factoryAddress,
      pairAddress: reserves.pairAddress,
      route: [tokenIn.symbol, tokenOut.symbol],
      estimatedGasUnits,
      estimatedGasCostBnb,
      estimatedGasCostUsd: Number(estimatedGasCostUsd.toFixed(4)),
      hasSufficientLiquidity: true,
      warnings,
    };
  }

  /**
   * Simulates pre-swap validation including ERC-20 allowances and execution readiness.
   */
  public simulateSwap(
    quote: DexQuoteResult,
    userAddress: string,
    currentAllowance: bigint
  ): DexSwapSimulationResult {
    if (!DexService.validateAddress(userAddress)) {
      return {
        success: false,
        canExecute: false,
        requiredAllowance: quote.amountInBaseUnits,
        currentAllowance,
        needsApproval: true,
        estimatedGas: 0n,
        gasPriceGwei: '3',
        estimatedFeeBnb: '0.00',
        calldata: '0x',
        routerAddress: this.routerAddress,
        revertReason: `INVALID_USER_ADDRESS: ${userAddress}`,
      };
    }

    if (!quote.hasSufficientLiquidity) {
      return {
        success: false,
        canExecute: false,
        requiredAllowance: quote.amountInBaseUnits,
        currentAllowance,
        needsApproval: false,
        estimatedGas: 0n,
        gasPriceGwei: '3',
        estimatedFeeBnb: '0.00',
        calldata: '0x',
        routerAddress: this.routerAddress,
        revertReason: 'INSUFFICIENT_POOL_LIQUIDITY',
      };
    }

    const needsApproval = currentAllowance < quote.amountInBaseUnits;

    return {
      success: true,
      canExecute: !needsApproval,
      requiredAllowance: quote.amountInBaseUnits,
      currentAllowance,
      needsApproval,
      estimatedGas: quote.estimatedGasUnits,
      gasPriceGwei: '3',
      estimatedFeeBnb: quote.estimatedGasCostBnb,
      calldata: '0x38ed1739', // swapExactTokensForTokens function selector
      routerAddress: this.routerAddress,
    };
  }

  /**
   * Prepares a testnet-only swap execution payload requiring explicit user confirmation.
   */
  public buildSwapTransaction(params: DexSwapParams): {
    to: string;
    value: string;
    data: string;
    deadline: number;
    amountIn: string;
    amountOutMin: string;
  } {
    if (!params.confirmed) {
      throw new Error('CONFIRMATION_REQUIRED: Swap cannot be dispatched without explicit user confirmation.');
    }

    if (!DexService.validateAddress(params.recipientAddress)) {
      throw new Error(`INVALID_RECIPIENT: Recipient address "${params.recipientAddress}" is invalid.`);
    }

    if (!params.quote.hasSufficientLiquidity) {
      throw new Error('INSUFFICIENT_LIQUIDITY: Cannot build transaction for pool with zero or depleted liquidity.');
    }

    const deadline = Math.floor(Date.now() / 1000) + (params.deadlineSeconds || 300);

    return {
      to: this.routerAddress,
      value: '0', // ERC-20 to ERC-20 swap carries 0 native BNB value
      data: `0x38ed1739_${params.quote.amountInBaseUnits.toString(16)}_${params.quote.minAmountOutBaseUnits.toString(16)}`,
      deadline,
      amountIn: params.quote.amountInFormatted,
      amountOutMin: params.quote.minAmountOutFormatted,
    };
  }

  /**
   * Evaluates transaction receipt and classifies outcomes.
   */
  public parseTransactionResult(
    txHash: string,
    receipt: { status: 'success' | 'reverted' | number; blockNumber?: number; gasUsed?: bigint; from: string; to: string },
    quote: DexQuoteResult
  ): DexSwapExecutionReceipt {
    const isSuccess = receipt.status === 'success' || receipt.status === 1;

    return {
      status: isSuccess ? 'CONFIRMED' : 'REVERTED',
      txHash,
      blockNumber: receipt.blockNumber,
      confirmations: isSuccess ? 1 : 0,
      from: receipt.from,
      to: receipt.to,
      amountIn: quote.amountInFormatted,
      amountOut: isSuccess ? quote.expectedAmountOutFormatted : '0.00',
      gasUsed: receipt.gasUsed || quote.estimatedGasUnits,
      effectiveGasPrice: 3000000000n, // 3 Gwei
      networkId: 'bsc-testnet',
      chainId: this.chainId,
      explorerUrl: `https://testnet.bscscan.com/tx/${txHash}`,
      errorMessage: isSuccess ? undefined : 'PancakeRouter: TRANSFER_FAILED or INSUFFICIENT_OUTPUT_AMOUNT',
    };
  }

  /**
   * Calculates parameters for testnet liquidity provision (PancakeSwap V2 addLiquidity).
   */
  public static calculateLiquidityProvision(
    tokenA: TokenInfo,
    tokenB: TokenInfo,
    amountADesired: bigint,
    amountBDesired: bigint,
    reserveA: bigint,
    reserveB: bigint,
    totalLpSupply: bigint,
    slippagePercent: number = 0.5,
    deadlineSeconds: number = 300
  ): LiquidityProvisionQuote {
    if (amountADesired <= 0n || amountBDesired <= 0n) {
      throw new Error('INSUFFICIENT_DESIRED_AMOUNTS: Desired liquidity amounts must be strictly positive.');
    }

    let optimalAmountB = amountBDesired;
    let expectedLp = 0n;

    if (reserveA > 0n && reserveB > 0n) {
      // Optimal B = (amountADesired * reserveB) / reserveA
      optimalAmountB = (amountADesired * reserveB) / reserveA;
      if (optimalAmountB > amountBDesired) {
        optimalAmountB = amountBDesired;
      }
      // LP minted = min((amountA * totalLp) / reserveA, (amountB * totalLp) / reserveB)
      const lpA = (amountADesired * totalLpSupply) / reserveA;
      const lpB = (optimalAmountB * totalLpSupply) / reserveB;
      expectedLp = lpA < lpB ? lpA : lpB;
    } else {
      // Initial pool creation: LP = sqrt(amountA * amountB) - 1000n (PancakeSwap V2 minimum liquidity lock)
      // Integer square root approximation for BigInt
      const product = amountADesired * amountBDesired;
      let z = product;
      let x = product / 2n + 1n;
      while (x < z) {
        z = x;
        x = (product / x + x) / 2n;
      }
      expectedLp = z > 1000n ? z - 1000n : z;
    }

    const amountAMin = DexService.calculateMinimumReceived(amountADesired, slippagePercent);
    const amountBMin = DexService.calculateMinimumReceived(optimalAmountB, slippagePercent);
    const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds;

    const newTotalLp = totalLpSupply + expectedLp;
    const poolSharePercent = newTotalLp > 0n ? Number((expectedLp * 10000n) / newTotalLp) / 100 : 100;

    return {
      tokenA,
      tokenB,
      amountADesired,
      amountBDesired: optimalAmountB,
      amountAMin,
      amountBMin,
      expectedLpTokens: expectedLp,
      poolSharePercent,
      deadline,
      slippagePercent,
    };
  }

  /**
   * Calculates parameters for testnet liquidity removal (PancakeSwap V2 removeLiquidity).
   */
  public static calculateLiquidityRemoval(
    lpTokenAmount: bigint,
    totalLpSupply: bigint,
    reserveA: bigint,
    reserveB: bigint,
    slippagePercent: number = 0.5,
    deadlineSeconds: number = 300
  ): LiquidityRemovalQuote {
    if (lpTokenAmount <= 0n) {
      throw new Error('INSUFFICIENT_LP_AMOUNT: LP token amount to remove must be strictly positive.');
    }
    if (totalLpSupply <= 0n || lpTokenAmount > totalLpSupply) {
      throw new Error('INVALID_TOTAL_SUPPLY: Total LP supply is insufficient for requested removal.');
    }

    // amountA = (lpTokenAmount * reserveA) / totalLpSupply
    const expectedAmountA = (lpTokenAmount * reserveA) / totalLpSupply;
    const expectedAmountB = (lpTokenAmount * reserveB) / totalLpSupply;

    const amountAMin = DexService.calculateMinimumReceived(expectedAmountA, slippagePercent);
    const amountBMin = DexService.calculateMinimumReceived(expectedAmountB, slippagePercent);
    const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds;

    const poolShareRemovedPercent = Number((lpTokenAmount * 10000n) / totalLpSupply) / 100;

    return {
      lpTokenAmount,
      amountAMin,
      amountBMin,
      expectedAmountA,
      expectedAmountB,
      poolShareRemovedPercent,
      deadline,
      slippagePercent,
    };
  }

  /**
   * Executes a comprehensive Liquidity Stress Test for a $1,000 total pool ($500 LIORA + $500 USDT).
   */
  public static runLiquidityStressTest(
    totalPoolValueUSD: number = 1000,
    tokenPriceUSD: number = 0.00231214, // ₹0.20 at 86.50
    tradeSizesUSD: number[] = [10, 25, 50, 100, 250, 500],
    removalPercentages: number[] = [10, 25, 50, 80]
  ): LiquidityStressTestResult {
    // $1,000 total pool = $500 paired quote asset (USDT) + $500 worth of tokens
    const pairedReserveUSD = totalPoolValueUSD / 2;
    const tokenReserveUSD = totalPoolValueUSD / 2;
    const tokenReserveUnits = tokenReserveUSD / tokenPriceUSD;

    const reserveTokensBase = parseUnits(tokenReserveUnits.toFixed(4), 18);
    const reservePairedBase = parseUnits(pairedReserveUSD.toFixed(4), 18);

    // 1. Trade size stress test table
    const tradeStressTable: TradeStressResult[] = tradeSizesUSD.map((tradeUSD) => {
      const tokensToSell = tradeUSD / tokenPriceUSD;
      const tokensToSellBase = parseUnits(tokensToSell.toFixed(4), 18);

      const pairedReceivedBase = DexService.calculateAmountOut(
        tokensToSellBase,
        reserveTokensBase,
        reservePairedBase
      );
      const pairedReceivedUSD = parseFloat(formatUnits(pairedReceivedBase, 18));
      const expectedExecutionPriceUSD = tokensToSell > 0 ? pairedReceivedUSD / tokensToSell : 0;

      // New reserves after trade
      const newReserveTokenBase = reserveTokensBase + tokensToSellBase;
      const newReservePairedBase = reservePairedBase - pairedReceivedBase;
      const newPairedUSD = parseFloat(formatUnits(newReservePairedBase, 18));
      const newTokenUnits = parseFloat(formatUnits(newReserveTokenBase, 18));

      const postTradeSpotPriceUSD = newTokenUnits > 0 ? newPairedUSD / newTokenUnits : 0;
      const priceImpactPercent = Math.max(0, ((tokenPriceUSD - expectedExecutionPriceUSD) / tokenPriceUSD) * 100);
      const slippagePercent = Math.max(0, ((tradeUSD - pairedReceivedUSD) / tradeUSD) * 100);
      const feeUSD = tradeUSD * 0.0025; // 0.25% PancakeSwap V2 fee

      let severity: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL' = 'LOW';
      if (priceImpactPercent > 20) severity = 'CRITICAL';
      else if (priceImpactPercent > 10) severity = 'SEVERE';
      else if (priceImpactPercent > 3) severity = 'MODERATE';

      return {
        tradeSizeUSD: tradeUSD,
        tokenQuantitySold: Number(tokensToSell.toFixed(2)),
        pairedAssetReceivedUSD: Number(pairedReceivedUSD.toFixed(2)),
        expectedExecutionPriceUSD: Number(expectedExecutionPriceUSD.toFixed(8)),
        postTradeSpotPriceUSD: Number(postTradeSpotPriceUSD.toFixed(8)),
        priceImpactPercent: Number(priceImpactPercent.toFixed(2)),
        slippagePercent: Number(slippagePercent.toFixed(2)),
        feeUSD: Number(feeUSD.toFixed(4)),
        remainingTokenReserve: Number(newTokenUnits.toFixed(2)),
        remainingPairedReserveUSD: Number(newPairedUSD.toFixed(2)),
        severity,
      };
    });

    // 2. Liquidity removal stress table
    const removalStressTable: LiquidityRemovalStressResult[] = removalPercentages.map((pct) => {
      const remainingPaired = pairedReserveUSD * (1 - pct / 100);
      const remainingTokens = tokenReserveUnits * (1 - pct / 100);

      const remPairedBase = parseUnits(remainingPaired.toFixed(4), 18);
      const remTokenBase = parseUnits(remainingTokens.toFixed(4), 18);

      // Price impact on $50 trade in depleted pool
      const sell50TokensBase = parseUnits((50 / tokenPriceUSD).toFixed(4), 18);
      let impact50 = 100;
      let impact100 = 100;

      try {
        const out50 = DexService.calculateAmountOut(sell50TokensBase, remTokenBase, remPairedBase);
        const out50USD = parseFloat(formatUnits(out50, 18));
        const exec50 = out50USD / (50 / tokenPriceUSD);
        impact50 = Math.max(0, ((tokenPriceUSD - exec50) / tokenPriceUSD) * 100);
      } catch {
        impact50 = 100;
      }

      // Price impact on $100 trade in depleted pool
      const sell100TokensBase = parseUnits((100 / tokenPriceUSD).toFixed(4), 18);
      try {
        const out100 = DexService.calculateAmountOut(sell100TokensBase, remTokenBase, remPairedBase);
        const out100USD = parseFloat(formatUnits(out100, 18));
        const exec100 = out100USD / (100 / tokenPriceUSD);
        impact100 = Math.max(0, ((tokenPriceUSD - exec100) / tokenPriceUSD) * 100);
      } catch {
        impact100 = 100;
      }

      return {
        removalPercent: pct,
        removedPairedUSD: Number((pairedReserveUSD * (pct / 100)).toFixed(2)),
        remainingPairedUSD: Number(remainingPaired.toFixed(2)),
        remainingTokenReserve: Number(remainingTokens.toFixed(2)),
        priceImpactOn50DollarTrade: Number(impact50.toFixed(2)),
        priceImpactOn100DollarTrade: Number(impact100.toFixed(2)),
        isPoolVulnerableToSandwich: impact50 > 5.0,
      };
    });

    // 3. Arbitrage / manipulation thresholds
    // Trade size to move spot price by X% in constant product: delta_y ≈ y * (sqrt(1 + X) - 1)
    const costToMovePrice5PercentUSD = Number((pairedReserveUSD * (Math.sqrt(1.05) - 1)).toFixed(2));
    const costToMovePrice10PercentUSD = Number((pairedReserveUSD * (Math.sqrt(1.10) - 1)).toFixed(2));
    const costToMovePrice25PercentUSD = Number((pairedReserveUSD * (Math.sqrt(1.25) - 1)).toFixed(2));
    const costToMovePrice50PercentUSD = Number((pairedReserveUSD * (Math.sqrt(1.50) - 1)).toFixed(2));

    // 4. Redemption Feasibility against $500 paired reserve
    const investorCountTested = 10;
    const averagePrincipalUSD = 500;
    const totalPrincipalUSD = investorCountTested * averagePrincipalUSD;
    const principalDeficitUSD = Math.max(0, totalPrincipalUSD - pairedReserveUSD);
    const principalCoverageRatioPercent = Number(((pairedReserveUSD / totalPrincipalUSD) * 100).toFixed(2));

    return {
      totalPoolValueUSD,
      pairedReserveUSD,
      tokenReserveUSD,
      initialSpotPriceUSD: tokenPriceUSD,
      feeBps: 25,
      tradeStressTable,
      removalStressTable,
      arbitrageManipulationThresholds: {
        costToMovePrice5PercentUSD,
        costToMovePrice10PercentUSD,
        costToMovePrice25PercentUSD,
        costToMovePrice50PercentUSD,
      },
      redemptionFeasibility: {
        investorCountTested,
        averagePrincipalUSD,
        totalPrincipalUSD,
        availablePairedReserveUSD: pairedReserveUSD,
        principalDeficitUSD,
        principalCoverageRatioPercent,
        isSolventForPrincipal: pairedReserveUSD >= totalPrincipalUSD,
      },
    };
  }

  /**
   * Helper decoding common AMM reverts into human-readable error messages.
   */
  public static decodeSwapError(error: unknown): string {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Pancake: K') || msg.includes('TRANSFER_FAILED')) {
      return 'SWAP_FAILED_TRANSFER: Transfer failed. Likely insufficient token balance or unapproved token allowance.';
    }
    if (msg.includes('EXPIRED') || msg.includes('deadline')) {
      return 'SWAP_FAILED_EXPIRED: Transaction deadline expired. Resubmit with an updated gas price.';
    }
    if (msg.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
      return 'SWAP_FAILED_SLIPPAGE: Return amount is lower than your slippage tolerance. Increase slippage tolerance.';
    }
    if (msg.includes('INSUFFICIENT_ALLOWANCE')) {
      return 'SWAP_FAILED_ALLOWANCE: Token allowance insufficient. Please approve the PancakeSwap router first.';
    }
    if (msg.includes('User rejected') || msg.includes('ACTION_REJECTED')) {
      return 'SWAP_USER_REJECTED: Transaction was cancelled by user in wallet.';
    }
    return `SWAP_EXECUTION_ERROR: ${msg}`;
  }
}

