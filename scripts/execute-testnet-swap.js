const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`\n=== LIORA COIN — PancakeSwap V2 Testnet Swap Verification ===`);
  console.log(`Target Network: ${hre.network.name} (Chain ID: ${chainId})`);

  if (chainId === 56) {
    throw new Error("SECURITY VIOLATION: Executing test swaps on BSC Mainnet (#56) is strictly prohibited.");
  }
  if (chainId !== 97 && chainId !== 31337) {
    throw new Error(`Unsupported network Chain ID ${chainId}. Only BSC Testnet (#97) and Local Devnet (#31337) are authorized.`);
  }

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer signer configured.");
  }

  const PANCAKESWAP_ROUTER_ADDRESS = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
  const PANCAKESWAP_FACTORY_ADDRESS = "0x6725F303b657a9451d8BA641348b6761A6CC7a17";

  const lioraDeploymentPath = path.resolve(__dirname, "../deployments/bscTestnet-liora.json");
  const usdtDeploymentPath = path.resolve(__dirname, "../deployments/bscTestnet-mock-usdt.json");
  const poolDeploymentPath = path.resolve(__dirname, "../deployments/bscTestnet-pool.json");

  let lioraAddress = process.env.LIORA_TOKEN_ADDRESS;
  let usdtAddress = process.env.USDT_TOKEN_ADDRESS;

  if (!lioraAddress && fs.existsSync(lioraDeploymentPath)) {
    const data = JSON.parse(fs.readFileSync(lioraDeploymentPath, "utf8"));
    lioraAddress = data.address;
  }
  if (!usdtAddress && fs.existsSync(usdtDeploymentPath)) {
    const data = JSON.parse(fs.readFileSync(usdtDeploymentPath, "utf8"));
    usdtAddress = data.address;
  }

  if (!lioraAddress || !usdtAddress) {
    throw new Error("Missing token addresses. Please ensure LioraToken and MockUSDT are deployed.");
  }

  const factoryAbi = ["function getPair(address, address) view returns (address)"];
  const factory = new hre.ethers.Contract(PANCAKESWAP_FACTORY_ADDRESS, factoryAbi, deployer);
  const pairAddress = await factory.getPair(lioraAddress, usdtAddress);

  if (pairAddress === hre.ethers.ZeroAddress) {
    throw new Error("Liquidity pool pair does not exist yet. Please run provision-testnet-pool.js first.");
  }

  console.log(`Pair Contract: ${pairAddress}`);
  console.log(`LIORA Address: ${lioraAddress}`);
  console.log(`USDT Address: ${usdtAddress}`);

  const pairAbi = [
    "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function token0() view returns (address)"
  ];
  const erc20Abi = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];
  const routerAbi = [
    "function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)",
    "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)"
  ];

  const pair = new hre.ethers.Contract(pairAddress, pairAbi, deployer);
  const liora = new hre.ethers.Contract(lioraAddress, erc20Abi, deployer);
  const usdt = new hre.ethers.Contract(usdtAddress, erc20Abi, deployer);
  const router = new hre.ethers.Contract(PANCAKESWAP_ROUTER_ADDRESS, routerAbi, deployer);

  const token0 = await pair.token0();
  const isLioraToken0 = token0.toLowerCase() === lioraAddress.toLowerCase();

  // Helper to query reserves
  async function queryReserves() {
    const [r0, r1] = await pair.getReserves();
    const reserveLiora = isLioraToken0 ? r0 : r1;
    const reserveUsdt = isLioraToken0 ? r1 : r0;
    return {
      reserveLiora,
      reserveUsdt,
      formattedLiora: hre.ethers.formatUnits(reserveLiora, 18),
      formattedUsdt: hre.ethers.formatUnits(reserveUsdt, 18)
    };
  }

  console.log("\n--- Initial Pool Reserves ---");
  let reserves = await queryReserves();
  console.log(`LIORA Reserve: ${reserves.formattedLiora}`);
  console.log(`USDT Reserve: ${reserves.formattedUsdt}`);

  const initialLioraBal = await liora.balanceOf(deployer.address);
  const initialUsdtBal = await usdt.balanceOf(deployer.address);
  console.log(`Deployer LIORA Balance: ${hre.ethers.formatUnits(initialLioraBal, 18)}`);
  console.log(`Deployer USDT Balance: ${hre.ethers.formatUnits(initialUsdtBal, 18)}`);

  // =========================================================================
  // SWAP 1: LIORA -> USDT (Sell 10 LIORA)
  // =========================================================================
  console.log("\n=== EXECUTING TEST SWAP 1: LIORA -> USDT ===");
  const amountLioraIn = hre.ethers.parseUnits("10", 18);
  const pathLioraToUsdt = [lioraAddress, usdtAddress];

  const amountsOut1 = await router.getAmountsOut(amountLioraIn, pathLioraToUsdt);
  const expectedUsdtOut = amountsOut1[1];
  const minUsdtOut = (expectedUsdtOut * 98n) / 100n; // 2% slippage tolerance

  console.log(`Swapping 10.0 LIORA for USDT...`);
  console.log(`Expected USDT Out: ${hre.ethers.formatUnits(expectedUsdtOut, 18)} USDT`);
  console.log(`Minimum USDT Out (2% slippage): ${hre.ethers.formatUnits(minUsdtOut, 18)} USDT`);

  // Exact Approval
  console.log("Approving exact 10.0 LIORA to router...");
  const txApprove1 = await liora.approve(PANCAKESWAP_ROUTER_ADDRESS, amountLioraIn);
  await txApprove1.wait();

  const deadline1 = Math.floor(Date.now() / 1000) + 300; // 5 minutes
  const txSwap1 = await router.swapExactTokensForTokens(
    amountLioraIn,
    minUsdtOut,
    pathLioraToUsdt,
    deployer.address,
    deadline1
  );
  const receipt1 = await txSwap1.wait();
  console.log(`>>> Swap 1 Complete! (tx: ${txSwap1.hash}, block: ${receipt1.blockNumber})`);

  reserves = await queryReserves();
  console.log(`Reserves after Swap 1: ${reserves.formattedLiora} LIORA | ${reserves.formattedUsdt} USDT`);

  // =========================================================================
  // SWAP 2: USDT -> LIORA (Buy LIORA with 1.0 USDT)
  // =========================================================================
  console.log("\n=== EXECUTING TEST SWAP 2: USDT -> LIORA ===");
  const amountUsdtIn = hre.ethers.parseUnits("1", 18);
  const pathUsdtToLiora = [usdtAddress, lioraAddress];

  const amountsOut2 = await router.getAmountsOut(amountUsdtIn, pathUsdtToLiora);
  const expectedLioraOut = amountsOut2[1];
  const minLioraOut = (expectedLioraOut * 98n) / 100n; // 2% slippage tolerance

  console.log(`Swapping 1.0 USDT for LIORA...`);
  console.log(`Expected LIORA Out: ${hre.ethers.formatUnits(expectedLioraOut, 18)} LIORA`);
  console.log(`Minimum LIORA Out (2% slippage): ${hre.ethers.formatUnits(minLioraOut, 18)} LIORA`);

  // Exact Approval
  console.log("Approving exact 1.0 USDT to router...");
  const txApprove2 = await usdt.approve(PANCAKESWAP_ROUTER_ADDRESS, amountUsdtIn);
  await txApprove2.wait();

  const deadline2 = Math.floor(Date.now() / 1000) + 300; // 5 minutes
  const txSwap2 = await router.swapExactTokensForTokens(
    amountUsdtIn,
    minLioraOut,
    pathUsdtToLiora,
    deployer.address,
    deadline2
  );
  const receipt2 = await txSwap2.wait();
  console.log(`>>> Swap 2 Complete! (tx: ${txSwap2.hash}, block: ${receipt2.blockNumber})`);

  reserves = await queryReserves();
  console.log(`Reserves after Swap 2: ${reserves.formattedLiora} LIORA | ${reserves.formattedUsdt} USDT`);

  const finalLioraBal = await liora.balanceOf(deployer.address);
  const finalUsdtBal = await usdt.balanceOf(deployer.address);
  console.log(`\nFinal Deployer Balances:`);
  console.log(`LIORA: ${hre.ethers.formatUnits(finalLioraBal, 18)} (Net Change: ${hre.ethers.formatUnits(finalLioraBal - initialLioraBal, 18)})`);
  console.log(`USDT: ${hre.ethers.formatUnits(finalUsdtBal, 18)} (Net Change: ${hre.ethers.formatUnits(finalUsdtBal - initialUsdtBal, 18)})`);

  // Record swap verification logs
  const swapLogs = {
    network: hre.network.name,
    chainId,
    pairAddress,
    swap1: {
      direction: "LIORA -> USDT",
      amountIn: hre.ethers.formatUnits(amountLioraIn, 18),
      expectedOut: hre.ethers.formatUnits(expectedUsdtOut, 18),
      txHash: txSwap1.hash,
      blockNumber: receipt1.blockNumber
    },
    swap2: {
      direction: "USDT -> LIORA",
      amountIn: hre.ethers.formatUnits(amountUsdtIn, 18),
      expectedOut: hre.ethers.formatUnits(expectedLioraOut, 18),
      txHash: txSwap2.hash,
      blockNumber: receipt2.blockNumber
    },
    finalReserves: {
      liora: reserves.formattedLiora,
      usdt: reserves.formattedUsdt
    },
    verifiedAt: new Date().toISOString()
  };

  const swapLogPath = path.join(__dirname, "../deployments/bscTestnet-swap-verification.json");
  fs.writeFileSync(swapLogPath, JSON.stringify(swapLogs, null, 2));
  console.log(`\nSwap verification log saved to: ${swapLogPath}`);
}

main().catch((error) => {
  console.error("Swap verification failed:", error);
  process.exitCode = 1;
});

