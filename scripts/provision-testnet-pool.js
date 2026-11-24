const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`\n=== LIORA COIN — PancakeSwap V2 Testnet Liquidity Provisioning ===`);
  console.log(`Target Network: ${hre.network.name} (Chain ID: ${chainId})`);

  if (chainId === 56) {
    throw new Error("SECURITY VIOLATION: Liquidity provisioning on BSC Mainnet (#56) is strictly prohibited.");
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

  // Check deployment records or pass via env
  const lioraDeploymentPath = path.resolve(__dirname, "../deployments/bscTestnet-liora.json");
  const usdtDeploymentPath = path.resolve(__dirname, "../deployments/bscTestnet-mock-usdt.json");

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
    throw new Error("Missing token addresses. Please ensure LioraToken and MockUSDT are deployed and configured.");
  }

  console.log(`LIORA Address: ${lioraAddress}`);
  console.log(`USDT Address: ${usdtAddress}`);
  console.log(`PancakeSwap Router: ${PANCAKESWAP_ROUTER_ADDRESS}`);
  console.log(`PancakeSwap Factory: ${PANCAKESWAP_FACTORY_ADDRESS}`);

  // Pool parameters: $1,000 Total Pool ($500 paired + $500 LIORA)
  // Option 2 (Approved sandbox reference): ₹0.20 per LIORA at ₹86.50/USD => 216,250 LIORA + 500 USDT
  const amountUsdtDesired = hre.ethers.parseUnits("500", 18); // 500 mUSDT units
  const lioraTokensCount = process.env.LIORA_POOL_TOKENS || "216250"; // Option 2 default
  const amountLioraDesired = hre.ethers.parseUnits(lioraTokensCount, 18);
  const lpRecipient = process.env.LP_RECIPIENT_ADDRESS || deployer.address;

  console.log(`\nApproved Option 2 Pool Composition:`);
  console.log(`- USDT Contribution: 500.0 mUSDT`);
  console.log(`- LIORA Contribution: ${lioraTokensCount} LIORA`);
  console.log(`- Implied Starting Price: $${(500 / parseFloat(lioraTokensCount)).toFixed(8)} USD per LIORA`);
  console.log(`- Implied INR Value (at ₹86.50/USD): ₹${((500 / parseFloat(lioraTokensCount)) * 86.50).toFixed(4)} INR per LIORA`);
  console.log(`- Initial Reserve Ratio: 1 USDT = ${(parseFloat(lioraTokensCount) / 500).toFixed(2)} LIORA`);
  console.log(`- LP Token Recipient: ${lpRecipient}`);

  const erc20Abi = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)"
  ];
  const liora = new hre.ethers.Contract(lioraAddress, erc20Abi, deployer);
  const usdt = new hre.ethers.Contract(usdtAddress, erc20Abi, deployer);

  const lioraBal = await liora.balanceOf(deployer.address);
  const usdtBal = await usdt.balanceOf(deployer.address);
  console.log(`Deployer LIORA Balance: ${hre.ethers.formatUnits(lioraBal, 18)}`);
  console.log(`Deployer USDT Balance: ${hre.ethers.formatUnits(usdtBal, 18)}`);

  if (lioraBal < amountLioraDesired || usdtBal < amountUsdtDesired) {
    throw new Error("Deployer token balance insufficient for requested pool funding.");
  }

  // Exact approvals (not infinite MAX_UINT256)
  console.log("\nApproving exact token amounts to PancakeSwap Router...");
  const txApproveLiora = await liora.approve(PANCAKESWAP_ROUTER_ADDRESS, amountLioraDesired);
  await txApproveLiora.wait();
  console.log(`- LIORA approved (tx: ${txApproveLiora.hash})`);

  const txApproveUsdt = await usdt.approve(PANCAKESWAP_ROUTER_ADDRESS, amountUsdtDesired);
  await txApproveUsdt.wait();
  console.log(`- USDT approved (tx: ${txApproveUsdt.hash})`);

  // Add liquidity
  const routerAbi = [
    "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)"
  ];
  const router = new hre.ethers.Contract(PANCAKESWAP_ROUTER_ADDRESS, routerAbi, deployer);

  const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes
  const amountLioraMin = (amountLioraDesired * 99n) / 100n; // 1% slippage tolerance
  const amountUsdtMin = (amountUsdtDesired * 99n) / 100n;

  console.log("\nSubmitting addLiquidity transaction...");
  const txAdd = await router.addLiquidity(
    lioraAddress,
    usdtAddress,
    amountLioraDesired,
    amountUsdtDesired,
    amountLioraMin,
    amountUsdtMin,
    lpRecipient, // LP tokens routed to designated recipient (deployer/treasury)
    deadline
  );

  const receipt = await txAdd.wait();
  console.log(`\n>>> Liquidity added successfully! (tx: ${txAdd.hash})`);
  console.log(`- Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`- Block Number: ${receipt.blockNumber}`);

  // Query pair address from factory
  const factoryAbi = ["function getPair(address, address) view returns (address)"];
  const factory = new hre.ethers.Contract(PANCAKESWAP_FACTORY_ADDRESS, factoryAbi, deployer);
  const pairAddress = await factory.getPair(lioraAddress, usdtAddress);
  console.log(`- PancakeSwap V2 Pair Address: ${pairAddress}`);

  // Save pool metadata
  const poolData = {
    network: hre.network.name,
    chainId,
    pairAddress,
    routerAddress: PANCAKESWAP_ROUTER_ADDRESS,
    factoryAddress: PANCAKESWAP_FACTORY_ADDRESS,
    tokenA: lioraAddress,
    tokenB: usdtAddress,
    initialLioraReserve: hre.ethers.formatUnits(amountLioraDesired, 18),
    initialUsdtReserve: hre.ethers.formatUnits(amountUsdtDesired, 18),
    txHash: txAdd.hash,
    blockNumber: receipt.blockNumber,
    lpRecipient,
    createdAt: new Date().toISOString()
  };

  const poolPath = path.join(__dirname, "../deployments/bscTestnet-pool.json");
  fs.writeFileSync(poolPath, JSON.stringify(poolData, null, 2));
  console.log(`Pool metadata saved to: ${poolPath}`);
}

main().catch((error) => {
  console.error("Pool provisioning failed:", error);
  process.exitCode = 1;
});

