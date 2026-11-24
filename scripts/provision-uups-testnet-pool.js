const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * LIORA UUPS Upgradeable Ecosystem — PancakeSwap V2 Testnet Pool Provisioning Script
 *
 * Deploys/Initializes a PancakeSwap V2 Pair for:
 * - Token A: UUPS LIORA Proxy (0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9)
 * - Token B: MockUSDT (0x0b419a33e8a6448547906DCB191b037Db5ac926e)
 *
 * Parameters:
 * - LIORA: 216,250.0 LIORA (from Operating Treasury 0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350)
 * - MockUSDT: 500.0 mUSDT
 * - Starting Spot Price: $0.00231216 (~₹0.20 INR at 86.50 FX)
 * - LP Recipient: 0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350
 *
 * STRICT GOVERNANCE & SAFETY:
 * - Requires explicit execution authorization.
 * - Fails closed if attempted on BSC Mainnet (Chain ID 56).
 */
async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("================================================================================");
  console.log("LIORA UUPS — PancakeSwap V2 Testnet Pool Provisioning");
  console.log(`Network: ${hre.network.name} | Chain ID: ${chainId}`);
  console.log("================================================================================");

  if (chainId === 56) {
    throw new Error("CRITICAL SAFETY ABORT: Liquidity provisioning on BSC Mainnet (Chain ID 56) is strictly prohibited.");
  }
  if (chainId !== 97 && chainId !== 31337) {
    throw new Error(`CRITICAL ABORT: Network Chain ID ${chainId} is unsupported. Only BSC Testnet (97) is authorized.`);
  }

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("BLOCKER: No deployer signer configured.");
  }

  const PANCAKESWAP_ROUTER_ADDRESS = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
  const PANCAKESWAP_FACTORY_ADDRESS = "0x6725F303b657a9451d8BA641348b6761A6CC7a17";
  const UUPS_LIORA_PROXY = "0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9";
  const MOCK_USDT_ADDRESS = "0x0b419a33e8a6448547906DCB191b037Db5ac926e";

  const lioraTokensCount = process.env.LIORA_POOL_TOKENS || "216250";
  const usdtAmountCount = process.env.USDT_POOL_TOKENS || "500";

  const amountLioraDesired = hre.ethers.parseUnits(lioraTokensCount, 18);
  const amountUsdtDesired = hre.ethers.parseUnits(usdtAmountCount, 18);
  const lpRecipient = process.env.LP_RECIPIENT_ADDRESS || deployer.address;

  console.log(`\nPool Configuration:`);
  console.log(`- UUPS LIORA Proxy:     ${UUPS_LIORA_PROXY}`);
  console.log(`- MockUSDT:             ${MOCK_USDT_ADDRESS}`);
  console.log(`- LIORA Contribution:   ${lioraTokensCount} LIORA`);
  console.log(`- USDT Contribution:    ${usdtAmountCount} mUSDT`);
  console.log(`- Implied Starting Price: $${(parseFloat(usdtAmountCount) / parseFloat(lioraTokensCount)).toFixed(8)} USD (~₹${((parseFloat(usdtAmountCount) / parseFloat(lioraTokensCount)) * 86.50).toFixed(4)} INR)`);
  console.log(`- LP Tokens Recipient:  ${lpRecipient}`);

  const erc20Abi = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)"
  ];
  const liora = new hre.ethers.Contract(UUPS_LIORA_PROXY, erc20Abi, deployer);
  const usdt = new hre.ethers.Contract(MOCK_USDT_ADDRESS, erc20Abi, deployer);

  const lioraBal = await liora.balanceOf(deployer.address);
  const usdtBal = await usdt.balanceOf(deployer.address);
  const bnbBal = await hre.ethers.provider.getBalance(deployer.address);

  console.log(`\nDeployer Balances:`);
  console.log(`- tBNB Gas Balance:     ${hre.ethers.formatEther(bnbBal)} tBNB`);
  console.log(`- UUPS LIORA Balance:   ${hre.ethers.formatUnits(lioraBal, 18)} LIORA`);
  console.log(`- MockUSDT Balance:     ${hre.ethers.formatUnits(usdtBal, 18)} mUSDT`);

  if (lioraBal < amountLioraDesired) {
    throw new Error(`Insufficient LIORA: Has ${hre.ethers.formatUnits(lioraBal, 18)}, needs ${lioraTokensCount}`);
  }
  if (usdtBal < amountUsdtDesired) {
    throw new Error(`Insufficient USDT: Has ${hre.ethers.formatUnits(usdtBal, 18)}, needs ${usdtAmountCount}`);
  }

  // 1. Exact Approval for LIORA
  console.log("\n1. Approving exact LIORA tokens to PancakeSwap Router...");
  const txApproveLiora = await liora.approve(PANCAKESWAP_ROUTER_ADDRESS, amountLioraDesired);
  console.log(`- Tx broadcast: ${txApproveLiora.hash}`);
  const rLiora = await txApproveLiora.wait();
  console.log(`  Confirmed in block ${rLiora.blockNumber} (gas used: ${rLiora.gasUsed})`);

  // 2. Exact Approval for MockUSDT
  console.log("\n2. Approving exact MockUSDT to PancakeSwap Router...");
  const txApproveUsdt = await usdt.approve(PANCAKESWAP_ROUTER_ADDRESS, amountUsdtDesired);
  console.log(`- Tx broadcast: ${txApproveUsdt.hash}`);
  const rUsdt = await txApproveUsdt.wait();
  console.log(`  Confirmed in block ${rUsdt.blockNumber} (gas used: ${rUsdt.gasUsed})`);

  // 3. Add Liquidity via Router
  console.log("\n3. Calling addLiquidity on PancakeSwap Router...");
  const routerAbi = [
    "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)"
  ];
  const router = new hre.ethers.Contract(PANCAKESWAP_ROUTER_ADDRESS, routerAbi, deployer);

  const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes
  const amountLioraMin = (amountLioraDesired * 99n) / 100n; // 1% slippage
  const amountUsdtMin = (amountUsdtDesired * 99n) / 100n;

  const txAdd = await router.addLiquidity(
    UUPS_LIORA_PROXY,
    MOCK_USDT_ADDRESS,
    amountLioraDesired,
    amountUsdtDesired,
    amountLioraMin,
    amountUsdtMin,
    lpRecipient,
    deadline
  );

  console.log(`- AddLiquidity Tx broadcast: ${txAdd.hash}`);
  const receipt = await txAdd.wait();
  console.log(`  Confirmed in block ${receipt.blockNumber} (gas used: ${receipt.gasUsed})`);

  // 4. Query new Pair Address from Factory
  const factoryAbi = ["function getPair(address, address) view returns (address)"];
  const factory = new hre.ethers.Contract(PANCAKESWAP_FACTORY_ADDRESS, factoryAbi, deployer);
  const pairAddress = await factory.getPair(UUPS_LIORA_PROXY, MOCK_USDT_ADDRESS);
  console.log(`\n>>> Newly Created PancakeSwap V2 Pair: ${pairAddress}`);

  // 5. Save Artifact
  const poolData = {
    network: hre.network.name,
    chainId,
    pairAddress,
    routerAddress: PANCAKESWAP_ROUTER_ADDRESS,
    factoryAddress: PANCAKESWAP_FACTORY_ADDRESS,
    tokenA: UUPS_LIORA_PROXY,
    tokenB: MOCK_USDT_ADDRESS,
    initialLioraReserve: hre.ethers.formatUnits(amountLioraDesired, 18),
    initialUsdtReserve: hre.ethers.formatUnits(amountUsdtDesired, 18),
    impliedSpotPriceUSD: (parseFloat(usdtAmountCount) / parseFloat(lioraTokensCount)).toFixed(8),
    impliedSpotPriceINR: ((parseFloat(usdtAmountCount) / parseFloat(lioraTokensCount)) * 86.50).toFixed(4),
    txHash: txAdd.hash,
    blockNumber: receipt.blockNumber,
    lpRecipient,
    createdAt: new Date().toISOString()
  };

  const poolPath = path.join(__dirname, "../deployments/bscTestnet-uups-pool.json");
  fs.writeFileSync(poolPath, JSON.stringify(poolData, null, 2));
  console.log(`Pool metadata saved to: ${poolPath}`);
}

main().catch((err) => {
  console.error("Pool provisioning aborted with error:", err);
  process.exitCode = 1;
});
