import { ChainConfig } from '../types/blockchain.types';

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    contracts: {
      musicCollaborationHub: '0x1234567890123456789012345678901234567890',
      aiAgentRegistry: '0x2345678901234567890123456789012345678901',
      revenueDistribution: '0x3456789012345678901234567890123456789012',
      ccipRouter: '0x4567890123456789012345678901234567890123',
    },
  },
  // Monad (using placeholder chain ID - will be updated when Monad launches)
  60808: {
    chainId: 60808,
    name: 'Monad',
    rpcUrl: process.env.MONAD_RPC_URL || 'https://monad-rpc.example.com',
    explorerUrl: 'https://monad-explorer.example.com',
    nativeCurrency: {
      name: 'Monad',
      symbol: 'MON',
      decimals: 18,
    },
    contracts: {
      highSpeedMusicProcessor: '0x5678901234567890123456789012345678901234',
      parallelAudioRenderer: '0x6789012345678901234567890123456789012345',
      realtimePayments: '0x7890123456789012345678901234567890123456',
      ccipRouter: '0x8901234567890123456789012345678901234567',
    },
  },
  8453: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    contracts: {
      userFriendlyMarketplace: '0x9012345678901234567890123456789012345678',
      socialFeatures: '0x0123456789012345678901234567890123456789',
      ccipRouter: '0x1234567890123456789012345678901234567890',
    },
  },
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    contracts: {
      marketingHub: '0x2345678901234567890123456789012345678901',
      ccipRouter: '0x3456789012345678901234567890123456789012',
    },
  },
};

export const CHAIN_SELECTORS = {
  ethereum: '5009297550715157269',
  monad: '123456789012345678', // Placeholder - will be updated
  base: '15971525489660198786',
  arbitrum: '4949039107694359620',
};

export const getChainConfig = (chainId: number): ChainConfig => {
  const config = SUPPORTED_CHAINS[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return config;
};

export const isChainSupported = (chainId: number): boolean => {
  return chainId in SUPPORTED_CHAINS;
};