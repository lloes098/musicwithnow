export const CONTRACT_ADDRESSES = {
  ethereum: {
    musicCollaborationHub: '0x1234567890123456789012345678901234567890',
    aiAgentRegistry: '0x2345678901234567890123456789012345678901',
    revenueDistribution: '0x3456789012345678901234567890123456789012',
    ccipRouter: '0x4567890123456789012345678901234567890123',
  },
  monad: {
    highSpeedMusicProcessor: '0x5678901234567890123456789012345678901234',
    parallelAudioRenderer: '0x6789012345678901234567890123456789012345',
    realtimePayments: '0x7890123456789012345678901234567890123456',
    ccipRouter: '0x8901234567890123456789012345678901234567',
  },
  base: {
    userFriendlyMarketplace: '0x9012345678901234567890123456789012345678',
    socialFeatures: '0x0123456789012345678901234567890123456789',
    ccipRouter: '0x1234567890123456789012345678901234567890',
  },
  arbitrum: {
    marketingHub: '0x2345678901234567890123456789012345678901',
    ccipRouter: '0x3456789012345678901234567890123456789012',
  }
};

export const MUSIC_HUB_ABI = [
  {
    "inputs": [
      {
        "components": [
          {"name": "title", "type": "string"},
          {"name": "genre", "type": "string"},
          {"name": "totalBudget", "type": "uint256"},
          {"name": "deadline", "type": "uint256"}
        ],
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "createProject",
    "outputs": [{"name": "projectId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "projectId", "type": "uint256"},
      {"name": "agentAddress", "type": "address"},
      {"name": "workType", "type": "string"},
      {"name": "proposedRate", "type": "uint256"}
    ],
    "name": "joinCollaboration",
    "outputs": [{"name": "success", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "projectId", "type": "uint256"}],
    "name": "getProject",
    "outputs": [
      {
        "components": [
          {"name": "id", "type": "uint256"},
          {"name": "title", "type": "string"},
          {"name": "creator", "type": "address"},
          {"name": "status", "type": "uint8"},
          {"name": "totalBudget", "type": "uint256"},
          {"name": "deadline", "type": "uint256"}
        ],
        "name": "project",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export const AI_AGENT_REGISTRY_ABI = [
  {
    "inputs": [
      {"name": "name", "type": "string"},
      {"name": "specializations", "type": "string[]"},
      {"name": "pricePerHour", "type": "uint256"}
    ],
    "name": "registerAgent",
    "outputs": [{"name": "agentId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "agentAddress", "type": "address"}],
    "name": "getAgent",
    "outputs": [
      {
        "components": [
          {"name": "id", "type": "uint256"},
          {"name": "owner", "type": "address"},
          {"name": "name", "type": "string"},
          {"name": "reputation", "type": "uint256"},
          {"name": "pricePerHour", "type": "uint256"},
          {"name": "isAvailable", "type": "bool"}
        ],
        "name": "agent",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export const CCIP_ROUTER_ABI = [
  {
    "inputs": [
      {
        "components": [
          {"name": "receiver", "type": "bytes"},
          {"name": "data", "type": "bytes"},
          {"name": "tokenAmounts", "type": "tuple[]"},
          {"name": "feeToken", "type": "address"},
          {"name": "extraArgs", "type": "bytes"}
        ],
        "name": "message",
        "type": "tuple"
      },
      {"name": "destinationChainSelector", "type": "uint64"}
    ],
    "name": "ccipSend",
    "outputs": [{"name": "messageId", "type": "bytes32"}],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "destinationChainSelector", "type": "uint64"},
      {
        "components": [
          {"name": "receiver", "type": "bytes"},
          {"name": "data", "type": "bytes"},
          {"name": "tokenAmounts", "type": "tuple[]"},
          {"name": "feeToken", "type": "address"},
          {"name": "extraArgs", "type": "bytes"}
        ],
        "name": "message",
        "type": "tuple"
      }
    ],
    "name": "getFee",
    "outputs": [{"name": "fee", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];