export const BLOCKCHAIN_CONFIG = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      infura: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      alchemy: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    },
    blockExplorerUrls: ['https://etherscan.io'],
    contracts: {
      musicHub: process.env.ETH_MUSIC_HUB_CONTRACT || '0x1234567890123456789012345678901234567890',
      aiRegistry: process.env.ETH_AI_REGISTRY_CONTRACT || '0x2345678901234567890123456789012345678901',
      paymentSplitter: process.env.ETH_PAYMENT_CONTRACT || '0x3456789012345678901234567890123456789012',
    },
  },
  
  monad: {
    chainId: 60808, // Placeholder - will be updated when Monad launches
    name: 'Monad',
    nativeCurrency: {
      name: 'Monad',
      symbol: 'MON',
      decimals: 18,
    },
    rpcUrls: {
      default: process.env.MONAD_RPC_URL || 'https://monad-rpc.example.com',
    },
    blockExplorerUrls: ['https://monad-explorer.example.com'],
    contracts: {
      highSpeedProcessor: process.env.MONAD_PROCESSOR_CONTRACT || '0x4567890123456789012345678901234567890123',
      realtimePayments: process.env.MONAD_PAYMENTS_CONTRACT || '0x5678901234567890123456789012345678901234',
      parallelRenderer: process.env.MONAD_RENDERER_CONTRACT || '0x6789012345678901234567890123456789012345',
    },
  },

  base: {
    chainId: 8453,
    name: 'Base',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    },
    blockExplorerUrls: ['https://basescan.org'],
    contracts: {
      marketplace: process.env.BASE_MARKETPLACE_CONTRACT || '0x7890123456789012345678901234567890123456',
      socialHub: process.env.BASE_SOCIAL_CONTRACT || '0x8901234567890123456789012345678901234567',
    },
  },

  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    },
    blockExplorerUrls: ['https://arbiscan.io'],
    contracts: {
      marketingHub: process.env.ARB_MARKETING_CONTRACT || '0x9012345678901234567890123456789012345678',
    },
  },
};

export const GAS_LIMITS = {
  createProject: 300000,
  joinCollaboration: 200000,
  uploadFile: 150000,
  updateStatus: 100000,
  ccipSend: 500000,
  registerAgent: 250000,
};

export const GAS_PRICES = {
  ethereum: {
    slow: '20000000000', // 20 gwei
    standard: '25000000000', // 25 gwei
    fast: '30000000000', // 30 gwei
  },
  monad: {
    standard: '1000000000', // 1 gwei (expected to be much cheaper)
  },
  base: {
    standard: '1000000000', // 1 gwei
  },
  arbitrum: {
    standard: '100000000', // 0.1 gwei
  },
};

export const MULTICALL_ADDRESSES = {
  1: '0xcA11bde05977b3631167028862bE2a173976CA11', // Ethereum
  8453: '0xcA11bde05977b3631167028862bE2a173976CA11', // Base
  42161: '0xcA11bde05977b3631167028862bE2a173976CA11', // Arbitrum
  60808: '0xcA11bde05977b3631167028862bE2a173976CA11', // Monad (placeholder)
};

export const TOKENS = {
  USDC: {
    ethereum: '0xA0b86a33E6417c7C6C21803B51e5A3F6CE7E9354',
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    monad: '0x0000000000000000000000000000000000000000', // TBD
  },
  WETH: {
    ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    base: '0x4200000000000000000000000000000000000006',
    arbitrum: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    monad: '0x0000000000000000000000000000000000000000', // TBD
  },
};