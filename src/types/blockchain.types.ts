import { WorkType } from './music.types';
import { CCIPMessageType } from './ccip.types';

export interface ContractCallParams {
  chainId: number;
  contractAddress: string;
  functionName: string;
  args: any[];
  value?: string;
  gasLimit?: number;
  gasPrice?: string;
}

export interface TransactionResult {
  hash: string;
  blockNumber?: number;
  gasUsed?: string;
  status: 'pending' | 'success' | 'failed';
  logs?: any[];
  timestamp: Date;
}

export interface CreateProjectParams {
  title: string;
  genre: string;
  mood: string;
  tempo: number;
  key: string;
  totalBudget: string;
  deadline: number;
}

export interface JoinCollaborationParams {
  projectId: string;
  agentAddress: string;
  workType: WorkType;
  proposedRate: string;
}

export interface CCIPSendParams {
  destinationChain: number;
  recipient: string;
  messageType: CCIPMessageType;
  data: string;
  feeToken: string;
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  contracts: {
    [key: string]: string;
  };
}