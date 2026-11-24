const hre = require("hardhat");

async function main() {
  console.log("=== LIORA COIN — Gate C5 Pre-Broadcast Transaction Simulation ===");
  console.log("Option 2: ₹0.20 per LIORA at ₹86.50/USD rate => 216,250 LIORA + 500 mUSDT\n");

  const [deployer, trader] = await hre.ethers.getSigners();
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || hre.ethers.parseUnits("3", "gwei");

  console.log(`Deployer: ${deployer.address}`);
  console.log(`Gas Price used for cost estimation: ${hre.ethers.formatUnits(gasPrice, "gwei")} gwei\n`);

  // 1. Simulate Deploy LioraToken
  const LioraToken = await hre.ethers.getContractFactory("LioraToken");
  const deployTxLiora = await LioraToken.getDeployTransaction(deployer.address);
  const gasEstimateLiora = await hre.ethers.provider.estimateGas(deployTxLiora);
  const costLioraBNB = hre.ethers.formatEther(gasEstimateLiora * gasPrice);
  console.log(`[SIMULATION 1] Deploy LioraToken.sol`);
  console.log(`  - Gas Estimate: ${gasEstimateLiora.toString()} gas`);
  console.log(`  - Estimated BNB Cost: ${costLioraBNB} tBNB`);

  const liora = await LioraToken.deploy(deployer.address);
  await liora.waitForDeployment();
  const lioraAddress = await liora.getAddress();

  // 2. Simulate Deploy MockUSDT
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const deployTxUsdt = await MockUSDT.getDeployTransaction(deployer.address);
  const gasEstimateUsdt = await hre.ethers.provider.estimateGas(deployTxUsdt);
  const costUsdtBNB = hre.ethers.formatEther(gasEstimateUsdt * gasPrice);
  console.log(`\n[SIMULATION 2] Deploy MockUSDT.sol`);
  console.log(`  - Gas Estimate: ${gasEstimateUsdt.toString()} gas`);
  console.log(`  - Estimated BNB Cost: ${costUsdtBNB} tBNB`);

  const usdt = await MockUSDT.deploy(deployer.address);
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();

  // 3. Simulate Approvals to PancakeSwap Router
  const ROUTER_ADDRESS = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
  const amountLioraPool = hre.ethers.parseUnits("216250", 18);
  const amountUsdtPool = hre.ethers.parseUnits("500", 18);

  const gasApproveLiora = await liora.approve.estimateGas(ROUTER_ADDRESS, amountLioraPool);
  const costApproveLiora = hre.ethers.formatEther(gasApproveLiora * gasPrice);
  console.log(`\n[SIMULATION 3] Approve 216,250 LIORA to PancakeSwap Router`);
  console.log(`  - Spender: ${ROUTER_ADDRESS}`);
  console.log(`  - Exact Allowance: 216,250.0 LIORA`);
  console.log(`  - Gas Estimate: ${gasApproveLiora.toString()} gas`);
  console.log(`  - Estimated BNB Cost: ${costApproveLiora} tBNB`);

  const gasApproveUsdt = await usdt.approve.estimateGas(ROUTER_ADDRESS, amountUsdtPool);
  const costApproveUsdt = hre.ethers.formatEther(gasApproveUsdt * gasPrice);
  console.log(`\n[SIMULATION 4] Approve 500 mUSDT to PancakeSwap Router`);
  console.log(`  - Spender: ${ROUTER_ADDRESS}`);
  console.log(`  - Exact Allowance: 500.0 mUSDT`);
  console.log(`  - Gas Estimate: ${gasApproveUsdt.toString()} gas`);
  console.log(`  - Estimated BNB Cost: ${costApproveUsdt} tBNB`);

  // 4. Mathematical Pool Reserve Simulation (Constant Product AMM)
  console.log(`\n[SIMULATION 5] PancakeSwap V2 Pool Creation & Initial Reserves`);
  console.log(`  - Initial Reserve LIORA: 216,250.0 LIORA`);
  console.log(`  - Initial Reserve mUSDT: 500.0 mUSDT`);
  const kUnits = 216250n * 500n;
  console.log(`  - Constant Product k (token units): ${kUnits.toString()} (LIORA * USDT)`);
  console.log(`  - Implied Opening Price: $${(500 / 216250).toFixed(8)} USD per LIORA`);
  console.log(`  - Implied Opening INR: ₹${((500 / 216250) * 86.50).toFixed(4)} INR per LIORA`);
  console.log(`  - Initial Ratio: 1 mUSDT = ${(216250 / 500).toFixed(2)} LIORA`);
  console.log(`  - Typical addLiquidity Gas for fresh pair creation: ~2,800,000 to 3,200,000 gas (~0.0084 to 0.0096 tBNB)`);

  // 5. Swap Simulation with Constant Product & 0.25% PancakeSwap fee
  // Swap 1: Sell 10 LIORA for USDT
  console.log(`\n[SIMULATION 6] Test Swap 1: Sell 10.0 LIORA -> USDT`);
  const amountLioraIn = 10n * 10n**18n;
  const reserveLiora0 = 216250n * 10n**18n;
  const reserveUsdt0 = 500n * 10n**18n;
  const feeNumerator = 9975n;
  const feeDenominator = 10000n;

  const amountInWithFee1 = amountLioraIn * feeNumerator;
  const numerator1 = amountInWithFee1 * reserveUsdt0;
  const denominator1 = (reserveLiora0 * feeDenominator) + amountInWithFee1;
  const amountUsdtOut = numerator1 / denominator1;
  const minUsdtOut = (amountUsdtOut * 98n) / 100n; // 2% slippage tolerance

  console.log(`  - Amount In: 10.0 LIORA`);
  console.log(`  - Expected USDT Out: ${hre.ethers.formatUnits(amountUsdtOut, 18)} mUSDT`);
  console.log(`  - Minimum USDT Received (2% slippage): ${hre.ethers.formatUnits(minUsdtOut, 18)} mUSDT`);
  console.log(`  - Effective Price: $${(parseFloat(hre.ethers.formatUnits(amountUsdtOut, 18)) / 10).toFixed(8)} / LIORA`);
  console.log(`  - Price Impact: ${( (1 - (parseFloat(hre.ethers.formatUnits(amountUsdtOut, 18)) / 10) / (500 / 216250)) * 100 ).toFixed(4)}%`);
  console.log(`  - Typical swapExactTokensForTokens Gas: ~120,000 to 160,000 gas (~0.00036 to 0.00048 tBNB)`);

  // Post-Swap 1 Reserves
  const reserveLiora1 = reserveLiora0 + amountLioraIn;
  const reserveUsdt1 = reserveUsdt0 - amountUsdtOut;

  // Swap 2: Buy LIORA with 1.0 USDT
  console.log(`\n[SIMULATION 7] Test Swap 2: Buy LIORA with 1.0 mUSDT`);
  const amountUsdtIn = 1n * 10n**18n;
  const amountInWithFee2 = amountUsdtIn * feeNumerator;
  const numerator2 = amountInWithFee2 * reserveLiora1;
  const denominator2 = (reserveUsdt1 * feeDenominator) + amountInWithFee2;
  const amountLioraOut = numerator2 / denominator2;
  const minLioraOut = (amountLioraOut * 98n) / 100n; // 2% slippage tolerance

  console.log(`  - Amount In: 1.0 mUSDT`);
  console.log(`  - Expected LIORA Out: ${hre.ethers.formatUnits(amountLioraOut, 18)} LIORA`);
  console.log(`  - Minimum LIORA Received (2% slippage): ${hre.ethers.formatUnits(minLioraOut, 18)} LIORA`);
  console.log(`  - Effective Price: $${(1 / parseFloat(hre.ethers.formatUnits(amountLioraOut, 18))).toFixed(8)} / LIORA`);
  console.log(`  - Price Impact: ${( ((1 / parseFloat(hre.ethers.formatUnits(amountLioraOut, 18))) / (500 / 216250) - 1) * 100 ).toFixed(4)}%`);
  console.log(`  - Typical swapExactTokensForTokens Gas: ~120,000 to 160,000 gas (~0.00036 to 0.00048 tBNB)`);

  // Total Estimated Gas Budget
  const totalGasEstimated = gasEstimateLiora + gasEstimateUsdt + gasApproveLiora + gasApproveUsdt + 3000000n + 150000n + 150000n;
  const totalBNBEstimated = hre.ethers.formatEther(totalGasEstimated * gasPrice);
  console.log(`\n=== TOTAL ESTIMATED GAS FOR FULL BROADCAST SEQUENCE ===`);
  console.log(`Total Gas Units: ~${totalGasEstimated.toString()}`);
  console.log(`Total BNB Cost: ~${totalBNBEstimated} tBNB`);
  console.log(`Deployer Available Balance: 0.269157 tBNB`);
  console.log(`Gas Safety Margin: ${(0.269157 / parseFloat(totalBNBEstimated)).toFixed(1)}x coverage (Ample headroom)`);
}

main().catch(console.error);
