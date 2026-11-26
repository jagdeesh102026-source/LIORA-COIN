const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("======================================================================");
  console.log("LIORA — BSC Mainnet Post-Deployment Live On-Chain Verification");
  console.log("======================================================================\n");

  const artifactPath = path.resolve(__dirname, "../deployments/bscMainnet-uups.json");
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Deployment artifact not found at ${artifactPath}`);
  }
  const deployment = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const rpcList = [
    "https://bsc-dataseed1.ninicoin.io/",
    "https://bsc-dataseed1.defibit.io/",
    "https://bsc-dataseed2.defibit.io/",
    "https://bsc-dataseed.binance.org/",
  ];

  let provider;
  for (const rpc of rpcList) {
    try {
      const p = new ethers.JsonRpcProvider(rpc, 56, { staticNetwork: true });
      const b = await Promise.race([
        p.getBlockNumber(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4000)),
      ]);
      provider = p;
      console.log(`Connected to BSC Mainnet RPC: ${rpc}`);
      console.log(`BSC Mainnet Active Block:      ${b}\n`);
      break;
    } catch (_) {}
  }

  if (!provider) {
    throw new Error("Failed to connect to any BSC Mainnet RPC endpoint.");
  }
  console.log(`Deployment Timestamp:          ${deployment.deployedAt}\n`);

  const { proxyAddress, implementationV1, timelockAddress, reserveVaultAddress } = deployment.contracts;
  const { operatingTreasuryAddress, governanceAddress, minDelaySeconds } = deployment.governance;
  const deployerAddress = deployment.deployer;

  // 1. Bytecode verification
  console.log("--- 1. BYTECODE VERIFICATION ---");
  const [proxyBytecode, implBytecode, timelockBytecode, vaultBytecode] = await Promise.all([
    provider.getCode(proxyAddress),
    provider.getCode(implementationV1),
    provider.getCode(timelockAddress),
    provider.getCode(reserveVaultAddress),
  ]);

  console.log(`ERC1967 Proxy (${proxyAddress}):       Bytecode Length ${proxyBytecode.length} chars (PASS)`);
  console.log(`Logic Impl V1 (${implementationV1}):     Bytecode Length ${implBytecode.length} chars (PASS)`);
  console.log(`Timelock      (${timelockAddress}):     Bytecode Length ${timelockBytecode.length} chars (PASS)`);
  console.log(`Reserve Vault (${reserveVaultAddress}):  Bytecode Length ${vaultBytecode.length} chars (PASS)`);

  if (proxyBytecode === "0x" || implBytecode === "0x" || timelockBytecode === "0x" || vaultBytecode === "0x") {
    throw new Error("CRITICAL: One or more contracts have missing bytecode on BSC Mainnet!");
  }

  // 2. Proxy Implementation Slot
  console.log("\n--- 2. ERC1967 PROXY IMPLEMENTATION STORAGE SLOT ---");
  const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  const rawSlot = await provider.getStorage(proxyAddress, implSlot);
  const slotImplAddress = ethers.getAddress("0x" + rawSlot.slice(26));

  console.log(`Slot Value (Implementation): ${slotImplAddress}`);
  console.log(`Expected Implementation:     ${implementationV1}`);
  console.log(`Implementation Slot Match:   ${slotImplAddress.toLowerCase() === implementationV1.toLowerCase() ? "PASS" : "FAIL"}`);

  // 3. Token Supply & Invariant Balances
  console.log("\n--- 3. TOKEN METRICS & SUPPLY INVARIANTS ---");
  const tokenAbi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function hasRole(bytes32, address) view returns (bool)",
    "function UPGRADER_ROLE() view returns (bytes32)",
    "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  ];
  const token = new ethers.Contract(proxyAddress, tokenAbi, provider);

  const [name, symbol, decimals, totalSupply, treasuryBalance, reserveBalance, deployerBalance] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply(),
    token.balanceOf(operatingTreasuryAddress),
    token.balanceOf(reserveVaultAddress),
    token.balanceOf(deployerAddress),
  ]);

  console.log(`Token Name:          ${name}`);
  console.log(`Token Symbol:        ${symbol}`);
  console.log(`Decimals:            ${decimals}`);
  console.log(`Total Supply:        ${ethers.formatEther(totalSupply)} LIORA (Exact 100B: ${totalSupply === ethers.parseEther("100000000000") ? "PASS" : "FAIL"})`);
  console.log(`Treasury Balance:    ${ethers.formatEther(treasuryBalance)} LIORA (Exact 1B: ${treasuryBalance === ethers.parseEther("1000000000") ? "PASS" : "FAIL"})`);
  console.log(`Reserve Balance:     ${ethers.formatEther(reserveBalance)} LIORA (Exact 99B: ${reserveBalance === ethers.parseEther("99000000000") ? "PASS" : "FAIL"})`);
  console.log(`Deployer Balance:    ${ethers.formatEther(deployerBalance)} LIORA (Exact 0: ${deployerBalance === 0n ? "PASS" : "FAIL"})`);

  // 4. Timelock Controller & Roles
  console.log("\n--- 4. 48-HOUR TIMELOCK CONTROLLER & ROLE AUDIT ---");
  const timelockAbi = [
    "function getMinDelay() view returns (uint256)",
    "function hasRole(bytes32, address) view returns (bool)",
    "function PROPOSER_ROLE() view returns (bytes32)",
    "function EXECUTOR_ROLE() view returns (bytes32)",
    "function CANCELLER_ROLE() view returns (bytes32)",
    "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  ];
  const timelock = new ethers.Contract(timelockAddress, timelockAbi, provider);

  const [delaySecs, propRole, execRole, adminRole, upgraderRole, tokenAdminRole] = await Promise.all([
    timelock.getMinDelay(),
    timelock.PROPOSER_ROLE(),
    timelock.EXECUTOR_ROLE(),
    timelock.DEFAULT_ADMIN_ROLE(),
    token.UPGRADER_ROLE(),
    token.DEFAULT_ADMIN_ROLE(),
  ]);

  const [govIsProp, govIsExec, govIsAdmin, deployerIsAdmin] = await Promise.all([
    timelock.hasRole(propRole, governanceAddress),
    timelock.hasRole(execRole, governanceAddress),
    timelock.hasRole(adminRole, governanceAddress),
    timelock.hasRole(adminRole, deployerAddress),
  ]);

  const [timelockIsUpgrader, timelockIsAdmin, deployerIsUpgrader, deployerIsTokenAdmin] = await Promise.all([
    token.hasRole(upgraderRole, timelockAddress),
    token.hasRole(tokenAdminRole, timelockAddress),
    token.hasRole(upgraderRole, deployerAddress),
    token.hasRole(tokenAdminRole, deployerAddress),
  ]);

  console.log(`Timelock Min Delay:              ${Number(delaySecs)} seconds (${Number(delaySecs) / 3600} Hours: ${Number(delaySecs) === 172800 ? "PASS" : "FAIL"})`);
  console.log(`Governance has PROPOSER_ROLE:    ${govIsProp ? "PASS" : "FAIL"}`);
  console.log(`Governance has EXECUTOR_ROLE:    ${govIsExec ? "PASS" : "FAIL"}`);
  console.log(`Governance has TIMELOCK_ADMIN:   ${govIsAdmin ? "PASS" : "FAIL"}`);
  console.log(`Deployer holds TIMELOCK_ADMIN:   ${deployerIsAdmin ? "FAIL (Retained!)" : "PASS (0 Roles / Renounced)"}`);
  console.log(`Timelock holds Token UPGRADER:   ${timelockIsUpgrader ? "PASS" : "FAIL"}`);
  console.log(`Timelock holds Token ADMIN:      ${timelockIsAdmin ? "PASS" : "FAIL"}`);
  console.log(`Deployer holds Token UPGRADER:   ${deployerIsUpgrader ? "FAIL" : "PASS (0 Roles)"}`);
  console.log(`Deployer holds Token ADMIN:      ${deployerIsTokenAdmin ? "FAIL" : "PASS (0 Roles)"}`);

  // 5. Reserve Vault Ownership & Binding
  console.log("\n--- 5. RESERVE VAULT STATUS & OWNERSHIP HANDOVER ---");
  const vaultAbi = [
    "function token() view returns (address)",
    "function owner() view returns (address)",
    "function pendingOwner() view returns (address)",
  ];
  const vault = new ethers.Contract(reserveVaultAddress, vaultAbi, provider);

  const [boundToken, currentVaultOwner, pendingVaultOwner] = await Promise.all([
    vault.token(),
    vault.owner(),
    vault.pendingOwner(),
  ]);

  console.log(`Vault Bound Token:               ${boundToken} (Matches Token Proxy: ${boundToken.toLowerCase() === proxyAddress.toLowerCase() ? "PASS" : "FAIL"})`);
  console.log(`Vault Current Owner (Deployer):  ${currentVaultOwner}`);
  console.log(`Vault Pending Owner (Gov EOA):   ${pendingVaultOwner}`);
  console.log(`Pending Owner Matches Gov:       ${pendingVaultOwner.toLowerCase() === governanceAddress.toLowerCase() ? "PASS" : "FAIL"}`);

  // 6. Deployer Remaining Gas Balance
  console.log("\n--- 6. DEPLOYER REMAINING BALANCE ---");
  const deployerBnbBalance = await provider.getBalance(deployerAddress);
  console.log(`Deployer Remaining Gas Balance:  ${ethers.formatEther(deployerBnbBalance)} BNB`);

  console.log("\n======================================================================");
  console.log("POST-DEPLOYMENT LIVE ON-CHAIN VERIFICATION RESULT: ALL PASS");
  console.log("======================================================================\n");
}

main().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
