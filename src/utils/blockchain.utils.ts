import { ethers } from 'ethers';

/**
 * Format wei amount to readable string
 */
export function formatEther(wei: string | bigint): string {
  try {
    return ethers.formatEther(wei);
  } catch (error) {
    return '0';
  }
}

/**
 * Parse ether amount to wei
 */
export function parseEther(ether: string): bigint {
  try {
    return ethers.parseEther(ether);
  } catch (error) {
    throw new Error(`Invalid ether amount: ${ether}`);
  }
}

/**
 * Check if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Get checksummed address
 */
export function getChecksumAddress(address: string): string {
  try {
    return ethers.getAddress(address);
  } catch {
    throw new Error(`Invalid address: ${address}`);
  }
}

/**
 * Generate a random private key
 */
export function generatePrivateKey(): string {
  const wallet = ethers.Wallet.createRandom();
  return wallet.privateKey;
}

/**
 * Get address from private key
 */
export function getAddressFromPrivateKey(privateKey: string): string {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  } catch {
    throw new Error('Invalid private key');
  }
}

/**
 * Sign a message with private key
 */
export async function signMessage(message: string, privateKey: string): Promise<string> {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signMessage(message);
  } catch {
    throw new Error('Failed to sign message');
  }
}

/**
 * Verify a signed message
 */
export function verifyMessage(message: string, signature: string): string {
  try {
    return ethers.verifyMessage(message, signature);
  } catch {
    throw new Error('Invalid signature');
  }
}

/**
 * Calculate gas price with priority fee
 */
export function calculateGasPrice(baseFee: bigint, priorityFee: bigint = 2000000000n): bigint {
  return baseFee * 2n + priorityFee; // EIP-1559 formula
}

/**
 * Convert chain ID to network name
 */
export function getNetworkName(chainId: number): string {
  const networks: Record<number, string> = {
    1: 'ethereum',
    8453: 'base',
    42161: 'arbitrum',
    60808: 'monad',
  };
  
  return networks[chainId] || 'unknown';
}

/**
 * Get block explorer URL for transaction
 */
export function getBlockExplorerUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io/tx/',
    8453: 'https://basescan.org/tx/',
    42161: 'https://arbiscan.io/tx/',
    60808: 'https://monad-explorer.example.com/tx/',
  };
  
  const baseUrl = explorers[chainId] || '';
  return baseUrl ? `${baseUrl}${txHash}` : '';
}

/**
 * Wait for transaction confirmation with timeout
 */
export async function waitForTransaction(
  provider: ethers.Provider,
  txHash: string,
  confirmations: number = 1,
  timeout: number = 300000 // 5 minutes
): Promise<ethers.TransactionReceipt> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Transaction timeout')), timeout);
  });

  const txPromise = provider.waitForTransaction(txHash, confirmations);
  
  const receipt = await Promise.race([txPromise, timeoutPromise]);
  
  if (!receipt) {
    throw new Error('Transaction not found');
  }
  
  return receipt;
}

/**
 * Estimate gas with buffer
 */
export async function estimateGasWithBuffer(
  contract: ethers.Contract,
  methodName: string,
  args: any[],
  buffer: number = 20 // 20% buffer
): Promise<bigint> {
  try {
    const estimate = await contract[methodName].estimateGas(...args);
    return (estimate * BigInt(100 + buffer)) / 100n;
  } catch {
    throw new Error(`Failed to estimate gas for ${methodName}`);
  }
}

/**
 * Create multicall data
 */
export function createMulticallData(calls: Array<{ target: string; callData: string }>): string {
  const multicallInterface = new ethers.Interface([
    'function aggregate(tuple(address target, bytes callData)[] calls) returns (uint256 blockNumber, bytes[] returnData)'
  ]);
  
  return multicallInterface.encodeFunctionData('aggregate', [calls]);
}

/**
 * Decode multicall result
 */
export function decodeMulticallResult(data: string): { blockNumber: bigint; returnData: string[] } {
  const multicallInterface = new ethers.Interface([
    'function aggregate(tuple(address target, bytes callData)[] calls) returns (uint256 blockNumber, bytes[] returnData)'
  ]);
  
  const [blockNumber, returnData] = multicallInterface.decodeFunctionResult('aggregate', data);
  return { blockNumber, returnData };
}

/**
 * Check if transaction is confirmed
 */
export async function isTransactionConfirmed(
  provider: ethers.Provider,
  txHash: string,
  requiredConfirmations: number = 1
): Promise<boolean> {
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) return false;
    
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber + 1;
    
    return confirmations >= requiredConfirmations;
  } catch {
    return false;
  }
}