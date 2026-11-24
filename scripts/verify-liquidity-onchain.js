const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const rpcUrl = process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.bnbchain.org:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const lioraAddress = "0xeD155E37D0a400E63202cE031Fc1C984B18E7999";
  const usdtAddress = "0x0b419a33e8a6448547906DCB191b037Db5ac926e";
  const pairAddress = "0x64beE3847a766D35E6611985F3c3e51C78Af5D2c";
  const routerAddress = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
  const testWallet = "0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD";
  const deployerWallet = "0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350";

  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address, address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)"
  ];

  const pairAbi = [
    "function getReserves() view returns (uint112, uint112, uint32)",
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address, address) view returns (uint256)"
  ];

  const lioraContract = new ethers.Contract(lioraAddress, erc20Abi, provider);
  const usdtContract = new ethers.Contract(usdtAddress, erc20Abi, provider);
  const pairContract = new ethers.Contract(pairAddress, pairAbi, provider);

  console.log("=== ON-CHAIN STATE (BSC TESTNET #97) ===");
  const network = await provider.getNetwork();
  console.log("Connected Chain ID:", network.chainId.toString());

  // Pair state
  const token0 = await pairContract.token0();
  const token1 = await pairContract.token1();
  const reserves = await pairContract.getReserves();
  const totalLp = await pairContract.totalSupply();

  const isToken0Usdt = token0.toLowerCase() === usdtAddress.toLowerCase();
  const reserveUsdt = isToken0Usdt ? reserves[0] : reserves[1];
  const reserveLiora = isToken0Usdt ? reserves[1] : reserves[0];

  console.log("\n--- PancakeSwap V2 Pool ---");
  console.log("Pair Address:", pairAddress);
  console.log("Token0:", token0, isToken0Usdt ? "(mUSDT)" : "(LIORA)");
  console.log("Token1:", token1, isToken0Usdt ? "(LIORA)" : "(mUSDT)");
  console.log("Reserve mUSDT:", ethers.formatUnits(reserveUsdt, 18));
  console.log("Reserve LIORA:", ethers.formatUnits(reserveLiora, 18));
  console.log("Total LP Supply:", ethers.formatUnits(totalLp, 18), "Cake-LP");

  const ratioLioraPerUsdt = Number(ethers.formatUnits(reserveLiora, 18)) / Number(ethers.formatUnits(reserveUsdt, 18));
  const ratioUsdtPerLiora = Number(ethers.formatUnits(reserveUsdt, 18)) / Number(ethers.formatUnits(reserveLiora, 18));
  console.log(`Ratio: 1 mUSDT = ${ratioLioraPerUsdt.toFixed(4)} LIORA`);
  console.log(`Ratio: 1 LIORA = ${ratioUsdtPerLiora.toFixed(8)} mUSDT`);

  // Test wallet balances
  const testBnb = await provider.getBalance(testWallet);
  const testLiora = await lioraContract.balanceOf(testWallet);
  const testUsdt = await usdtContract.balanceOf(testWallet);
  const testLp = await pairContract.balanceOf(testWallet);
  const testLioraAllow = await lioraContract.allowance(testWallet, routerAddress);
  const testUsdtAllow = await usdtContract.allowance(testWallet, routerAddress);
  const testLpAllow = await pairContract.allowance(testWallet, routerAddress);

  console.log("\n--- Test Wallet Balances (0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD) ---");
  console.log("tBNB (Gas):", ethers.formatEther(testBnb));
  console.log("LIORA Balance:", ethers.formatUnits(testLiora, 18));
  console.log("mUSDT Balance:", ethers.formatUnits(testUsdt, 18));
  console.log("Cake-LP Balance:", ethers.formatUnits(testLp, 18));
  console.log("LIORA Router Allowance:", ethers.formatUnits(testLioraAllow, 18));
  console.log("mUSDT Router Allowance:", ethers.formatUnits(testUsdtAllow, 18));
  console.log("Cake-LP Router Allowance:", ethers.formatUnits(testLpAllow, 18));

  // Deployer LP
  const deployerLp = await pairContract.balanceOf(deployerWallet);
  console.log("\n--- Deployer Wallet (0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350) ---");
  console.log("Deployer Cake-LP Balance:", ethers.formatUnits(deployerLp, 18));

  // Quote calculation for 10 LIORA
  const testLioraInput = ethers.parseUnits("10.0", 18);
  const requiredUsdt = (testLioraInput * reserveUsdt) / reserveLiora;
  console.log("\n--- Proposed Small Liquidity Test ---");
  console.log("LIORA Input: 10.0 LIORA");
  console.log("Required mUSDT Input:", ethers.formatUnits(requiredUsdt, 18), "mUSDT");

  // Expected LP tokens: min((10 * totalLp)/reserveLiora, (requiredUsdt * totalLp)/reserveUsdt)
  const expectedLpFromLiora = (testLioraInput * totalLp) / reserveLiora;
  const expectedLpFromUsdt = (requiredUsdt * totalLp) / reserveUsdt;
  const expectedLp = expectedLpFromLiora < expectedLpFromUsdt ? expectedLpFromLiora : expectedLpFromUsdt;
  console.log("Expected LP Tokens Minted:", ethers.formatUnits(expectedLp, 18), "Cake-LP");

  const slippageTolerance = 0.005; // 0.5%
  const minLiora = (testLioraInput * 995n) / 1000n;
  const minUsdt = (requiredUsdt * 995n) / 1000n;
  console.log("Slippage Tolerance: 0.5%");
  console.log("Min. Accepted LIORA:", ethers.formatUnits(minLiora, 18));
  console.log("Min. Accepted mUSDT:", ethers.formatUnits(minUsdt, 18));
}

main().catch(console.error);
