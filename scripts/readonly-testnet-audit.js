const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("================================================================================");
  console.log("LIORA — BSC Testnet Read-Only Audit & Verification");
  console.log("================================================================================");

  const provider = ethers.provider;
  const network = await provider.getNetwork();
  console.log(`Active Chain ID: ${network.chainId} (Expected: 97 - BSC Testnet)`);

  const uupsProxyAddress = "0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9";
  const oldLioraAddress = "0xeD155E37D0a400E63202cE031Fc1C984B18E7999";
  const mockUsdtAddress = "0x0b419a33e8a6448547906DCB191b037Db5ac926e";
  const pancakeFactoryAddress = "0x6725F303b657a9451d8BA641348b6761A6CC7a17";
  const pancakeRouterAddress = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
  const operatingTreasuryAddress = "0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350";
  const reserveVaultAddress = "0x1E10a2bFcA618Ed3EFEf732f4352A774586FC320";

  const erc20Abi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ];

  const factoryAbi = [
    "function getPair(address tokenA, address tokenB) view returns (address pair)",
    "function allPairsLength() view returns (uint256)"
  ];

  const pairAbi = [
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function totalSupply() view returns (uint256)"
  ];

  // 1. Token Metrics on UUPS Proxy
  console.log("\n1. UUPS PROXY TOKEN STATE (0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9):");
  const uupsToken = new ethers.Contract(uupsProxyAddress, erc20Abi, provider);
  const name = await uupsToken.name();
  const symbol = await uupsToken.symbol();
  const decimals = await uupsToken.decimals();
  const totalSupply = await uupsToken.totalSupply();
  const treasuryBal = await uupsToken.balanceOf(operatingTreasuryAddress);
  const vaultBal = await uupsToken.balanceOf(reserveVaultAddress);
  const deadBal = await uupsToken.balanceOf("0x000000000000000000000000000000000000dEaD");
  const zeroBal = await uupsToken.balanceOf(ethers.ZeroAddress);

  console.log(`- Token Name:        ${name}`);
  console.log(`- Token Symbol:      ${symbol}`);
  console.log(`- Decimals:          ${decimals}`);
  console.log(`- Total Supply:      ${ethers.formatUnits(totalSupply, decimals)} LIORA`);
  console.log(`- Operating Treasury: ${ethers.formatUnits(treasuryBal, decimals)} LIORA (Address: ${operatingTreasuryAddress})`);
  console.log(`- Reserve Vault:     ${ethers.formatUnits(vaultBal, decimals)} LIORA (Address: ${reserveVaultAddress})`);
  console.log(`- Burn Address dead: ${ethers.formatUnits(deadBal, decimals)} LIORA`);

  // Calculate tokens accounted for
  const initialSupply = 100000000000n * 10n**18n;
  const burned = initialSupply - totalSupply;
  console.log(`- Permanently Burned: ${ethers.formatUnits(burned, decimals)} LIORA`);
  console.log(`- Initial Mint:      100,000,000,000.0 LIORA`);

  // Query Transfer events on UUPS Proxy
  console.log("\n2. UUPS PROXY HISTORICAL TRANSFERS & BURNS:");
  try {
    const currentBlock = await provider.getBlockNumber();
    // Query last 10,000 blocks (or from deployment)
    const filter = uupsToken.filters.Transfer();
    const fromBlock = Math.max(0, currentBlock - 20000);
    const events = await uupsToken.queryFilter(filter, fromBlock, currentBlock);
    console.log(`- Total Transfer events found in recent blocks (${fromBlock} to ${currentBlock}): ${events.length}`);
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      const val = ethers.formatUnits(e.args.value, decimals);
      console.log(`  Event ${i+1}: From: ${e.args.from} -> To: ${e.args.to} | Amount: ${val} LIORA | Tx: ${e.transactionHash}`);
    }
  } catch (err) {
    console.log(`- Event query note: ${err.message}`);
  }

  // 3. PancakeSwap Liquidity Pool Analysis
  console.log("\n3. PANCAKESWAP V2 LIQUIDITY POOL ANALYSIS:");
  const factory = new ethers.Contract(pancakeFactoryAddress, factoryAbi, provider);

  // Check pair for UUPS Proxy + Mock USDT
  const uupsPairAddress = await factory.getPair(uupsProxyAddress, mockUsdtAddress);
  console.log(`- PancakeSwap Pair for UUPS Proxy (${uupsProxyAddress}) + MockUSDT:`);
  console.log(`  Address: ${uupsPairAddress}`);
  if (uupsPairAddress === ethers.ZeroAddress) {
    console.log("  STATUS: NO POOL CREATED YET for UUPS Proxy + MockUSDT.");
  } else {
    const uupsPair = new ethers.Contract(uupsPairAddress, pairAbi, provider);
    const reserves = await uupsPair.getReserves();
    const token0 = await uupsPair.token0();
    const token1 = await uupsPair.token1();
    console.log(`  Token0: ${token0}, Token1: ${token1}`);
    console.log(`  Reserves: ${reserves.reserve0} / ${reserves.reserve1}`);
  }

  // Check pair for Old Non-upgradeable Token + Mock USDT
  const oldPairAddress = await factory.getPair(oldLioraAddress, mockUsdtAddress);
  console.log(`\n- PancakeSwap Pair for Gate C5 Non-Upgradeable Token (${oldLioraAddress}) + MockUSDT:`);
  console.log(`  Address: ${oldPairAddress}`);
  if (oldPairAddress !== ethers.ZeroAddress) {
    const oldPair = new ethers.Contract(oldPairAddress, pairAbi, provider);
    const reserves = await oldPair.getReserves();
    const token0 = await oldPair.token0();
    const token1 = await oldPair.token1();
    console.log(`  Token0: ${token0} (${token0.toLowerCase() === mockUsdtAddress.toLowerCase() ? 'MockUSDT' : 'LIORA_OLD'})`);
    console.log(`  Token1: ${token1} (${token1.toLowerCase() === oldLioraAddress.toLowerCase() ? 'LIORA_OLD' : 'MockUSDT'})`);
    console.log(`  Reserve0: ${ethers.formatUnits(reserves.reserve0, 18)}`);
    console.log(`  Reserve1: ${ethers.formatUnits(reserves.reserve1, 18)}`);
  }

  // 4. Gas Balance of Deployer / Treasury
  console.log("\n4. DEPLOYER / TREASURY WALLET STATE:");
  const tBnbBal = await provider.getBalance(operatingTreasuryAddress);
  console.log(`- Operating Treasury EOA: ${operatingTreasuryAddress}`);
  console.log(`- tBNB Gas Balance:       ${ethers.formatEther(tBnbBal)} tBNB`);
  console.log(`- LIORA Token Balance:    ${ethers.formatUnits(treasuryBal, decimals)} LIORA`);

  console.log("\n================================================================================");
  console.log("READ-ONLY VERIFICATION COMPLETE");
  console.log("================================================================================");
}

main().then(() => process.exit(0)).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
