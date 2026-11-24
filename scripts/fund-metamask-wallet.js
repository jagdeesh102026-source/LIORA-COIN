/**
 * LIORA COIN — Fund MetaMask Test Wallet Script
 * 
 * Prepares and broadcasts exactly two ERC-20 token transfers on BSC Testnet (Chain ID 97):
 * 1. 20 LIORA  -> Destination Wallet
 * 2. 5 mUSDT   -> Destination Wallet
 * 
 * SAFETY ENFORCEMENTS:
 * - Requires explicit DESTINATION_ADDRESS parameter.
 * - Strictly validates chain ID 97 (fails closed on any other chain).
 * - Verifies source token and native gas balances prior to sending.
 * - Confirms transaction receipts (status === 1) and destination balances.
 */

const { ethers } = require('hardhat');
require('dotenv').config();

const EXPECTED_CHAIN_ID = 97n;
const LIORA_TOKEN_ADDRESS = '0xeD155E37D0a400E63202cE031Fc1C984B18E7999';
const MOCK_USDT_ADDRESS = '0x0b419a33e8a6448547906DCB191b037Db5ac926e';

const LIORA_TRANSFER_AMOUNT = ethers.parseUnits('20', 18); // 20 LIORA
const MUSDT_TRANSFER_AMOUNT = ethers.parseUnits('5', 18);  // 5 mUSDT

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address recipient, uint256 amount) returns (bool)'
];

async function main() {
  const destinationArg = process.env.DESTINATION_WALLET || process.argv[2];
  if (!destinationArg) {
    throw new Error('Missing destination wallet address. Usage: DESTINATION_WALLET=<0x...> npx hardhat run scripts/fund-metamask-wallet.js --network bscTestnet');
  }

  const destinationAddress = ethers.getAddress(destinationArg);
  console.log('Target Destination Address:', destinationAddress);

  const provider = ethers.provider;
  const network = await provider.getNetwork();
  console.log('Connected Chain ID:', network.chainId.toString());

  if (network.chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(`Chain mismatch! Expected BSC Testnet (#97), received #${network.chainId}. Fails closed.`);
  }

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('DEPLOYER_PRIVATE_KEY is missing from environment.');
  }

  const signer = new ethers.Wallet(privateKey, provider);
  const sourceAddress = await signer.getAddress();
  console.log('Source Authorized Wallet (Deployer):', sourceAddress);

  // Contracts
  const lioraToken = new ethers.Contract(LIORA_TOKEN_ADDRESS, ERC20_ABI, signer);
  const musdtToken = new ethers.Contract(MOCK_USDT_ADDRESS, ERC20_ABI, signer);

  // Check balances
  const [sourceBnb, sourceLiora, sourceUsdt] = await Promise.all([
    provider.getBalance(sourceAddress),
    lioraToken.balanceOf(sourceAddress),
    musdtToken.balanceOf(sourceAddress)
  ]);

  console.log('\n--- SOURCE WALLET BALANCE CHECK ---');
  console.log(`tBNB Gas Balance:   ${ethers.formatEther(sourceBnb)} tBNB`);
  console.log(`LIORA Balance:      ${ethers.formatEther(sourceLiora)} LIORA`);
  console.log(`mUSDT Balance:      ${ethers.formatEther(sourceUsdt)} mUSDT`);

  if (sourceLiora < LIORA_TRANSFER_AMOUNT) {
    throw new Error(`Insufficient LIORA in source wallet. Required: 20 LIORA, Available: ${ethers.formatEther(sourceLiora)}`);
  }

  if (sourceUsdt < MUSDT_TRANSFER_AMOUNT) {
    throw new Error(`Insufficient mUSDT in source wallet. Required: 5 mUSDT, Available: ${ethers.formatEther(sourceUsdt)}`);
  }

  if (sourceBnb < ethers.parseEther('0.0005')) {
    throw new Error(`Insufficient tBNB in source wallet for transaction gas. Available: ${ethers.formatEther(sourceBnb)} tBNB. Please fund ${sourceAddress} with at least 0.005 tBNB.`);
  }

  // Pre-transfer destination balances
  const [destPreLiora, destPreUsdt] = await Promise.all([
    lioraToken.balanceOf(destinationAddress),
    musdtToken.balanceOf(destinationAddress)
  ]);

  console.log('\n--- DESTINATION WALLET PRE-TRANSFER ---');
  console.log(`Pre-Transfer LIORA: ${ethers.formatEther(destPreLiora)} LIORA`);
  console.log(`Pre-Transfer mUSDT: ${ethers.formatEther(destPreUsdt)} mUSDT`);

  // Transfer 1: 20 LIORA
  console.log('\n>>> Broadcasting Transfer 1: 20 LIORA ...');
  const txLiora = await lioraToken.transfer(destinationAddress, LIORA_TRANSFER_AMOUNT);
  console.log('LIORA Transfer Tx Hash:', txLiora.hash);
  console.log('Waiting for confirmation...');
  const receiptLiora = await txLiora.wait(1);
  console.log(`Confirmed in Block: ${receiptLiora.blockNumber}, Status: ${receiptLiora.status === 1 ? 'SUCCESS' : 'FAILED'}, Gas Used: ${receiptLiora.gasUsed.toString()}`);

  if (receiptLiora.status !== 1) {
    throw new Error(`LIORA transfer failed on-chain with status ${receiptLiora.status}`);
  }

  // Transfer 2: 5 mUSDT
  console.log('\n>>> Broadcasting Transfer 2: 5 mUSDT ...');
  const txUsdt = await musdtToken.transfer(destinationAddress, MUSDT_TRANSFER_AMOUNT);
  console.log('mUSDT Transfer Tx Hash:', txUsdt.hash);
  console.log('Waiting for confirmation...');
  const receiptUsdt = await txUsdt.wait(1);
  console.log(`Confirmed in Block: ${receiptUsdt.blockNumber}, Status: ${receiptUsdt.status === 1 ? 'SUCCESS' : 'FAILED'}, Gas Used: ${receiptUsdt.gasUsed.toString()}`);

  if (receiptUsdt.status !== 1) {
    throw new Error(`mUSDT transfer failed on-chain with status ${receiptUsdt.status}`);
  }

  // Post-transfer verification
  const [destPostLiora, destPostUsdt] = await Promise.all([
    lioraToken.balanceOf(destinationAddress),
    musdtToken.balanceOf(destinationAddress)
  ]);

  console.log('\n--- DESTINATION WALLET POST-TRANSFER VERIFICATION ---');
  console.log(`Post-Transfer LIORA: ${ethers.formatEther(destPostLiora)} LIORA`);
  console.log(`Post-Transfer mUSDT: ${ethers.formatEther(destPostUsdt)} mUSDT`);
  console.log(`LIORA Received:     ${ethers.formatEther(destPostLiora - destPreLiora)} LIORA`);
  console.log(`mUSDT Received:     ${ethers.formatEther(destPostUsdt - destPreUsdt)} mUSDT`);
  console.log('\nFunding transfers completed successfully.');
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error funding wallet:', err.message);
      process.exit(1);
    });
}

module.exports = { main };
