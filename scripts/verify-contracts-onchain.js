const hre = require("hardhat");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  console.log(`Verified Chain ID: ${network.chainId}`);

  const routerAddress = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
  const factoryAddress = "0x6725F303b657a9451d8BA641348b6761A6CC7a17";

  const routerCode = await hre.ethers.provider.getCode(routerAddress);
  const factoryCode = await hre.ethers.provider.getCode(factoryAddress);

  console.log(`Router Code Length: ${routerCode.length} bytes (Bytecode present: ${routerCode !== "0x"})`);
  console.log(`Factory Code Length: ${factoryCode.length} bytes (Bytecode present: ${factoryCode !== "0x"})`);

  const router = new hre.ethers.Contract(
    routerAddress,
    ["function factory() view returns (address)", "function WETH() view returns (address)"],
    hre.ethers.provider
  );

  const onChainFactory = await router.factory();
  const onChainWeth = await router.WETH();
  console.log(`Router.factory() on-chain: ${onChainFactory}`);
  console.log(`Matches expected factory: ${onChainFactory.toLowerCase() === factoryAddress.toLowerCase()}`);
  console.log(`Router.WETH() on-chain: ${onChainWeth}`);

  const factory = new hre.ethers.Contract(
    factoryAddress,
    ["function allPairsLength() view returns (uint256)", "function feeTo() view returns (address)"],
    hre.ethers.provider
  );

  const pairsLength = await factory.allPairsLength();
  console.log(`Total Pairs on PancakeSwap Factory: ${pairsLength.toString()}`);
}

main().catch(console.error);
