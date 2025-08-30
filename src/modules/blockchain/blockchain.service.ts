import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, Contract, Provider, Wallet } from 'ethers';
import { 
  ContractCallParams, 
  TransactionResult, 
  CreateProjectParams,
  JoinCollaborationParams,
  ChainConfig 
} from '../../types/blockchain.types';
import { SUPPORTED_CHAINS, getChainConfig } from '../../config/chains.config';
import { MUSIC_HUB_ABI, AI_AGENT_REGISTRY_ABI, CONTRACT_ADDRESSES } from '../../config/contracts.config';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private providers: Map<number, Provider> = new Map();
  private wallets: Map<number, Wallet> = new Map();
  private contracts: Map<string, Contract> = new Map();

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeProviders();
    await this.initializeWallets();
    await this.initializeContracts();
  }

  private async initializeProviders() {
    for (const [chainId, config] of Object.entries(SUPPORTED_CHAINS)) {
      try {
        const provider = new ethers.JsonRpcProvider(config.rpcUrl);
        await provider.getNetwork();
        this.providers.set(parseInt(chainId), provider);
        this.logger.log(`Initialized provider for chain ${config.name}`);
      } catch (error) {
        this.logger.error(`Failed to initialize provider for chain ${config.name}:`, error);
      }
    }
  }

  private async initializeWallets() {
    const privateKey = this.configService.get<string>('PRIVATE_KEY');
    if (!privateKey) {
      this.logger.warn('No private key provided. Some functions may not work.');
      return;
    }

    for (const [chainId, provider] of this.providers.entries()) {
      try {
        const wallet = new Wallet(privateKey, provider);
        this.wallets.set(chainId, wallet);
        this.logger.log(`Initialized wallet for chain ${chainId}`);
      } catch (error) {
        this.logger.error(`Failed to initialize wallet for chain ${chainId}:`, error);
      }
    }
  }

  private async initializeContracts() {
    for (const [chainId, provider] of this.providers.entries()) {
      const wallet = this.wallets.get(chainId);
      if (!wallet) continue;

      const config = getChainConfig(chainId);
      
      try {
        // Music Hub Contract
        if (config.contracts.musicCollaborationHub) {
          const musicHub = new Contract(
            config.contracts.musicCollaborationHub,
            MUSIC_HUB_ABI,
            wallet
          );
          this.contracts.set(`musicHub_${chainId}`, musicHub);
        }

        // AI Agent Registry Contract
        if (config.contracts.aiAgentRegistry) {
          const agentRegistry = new Contract(
            config.contracts.aiAgentRegistry,
            AI_AGENT_REGISTRY_ABI,
            wallet
          );
          this.contracts.set(`agentRegistry_${chainId}`, agentRegistry);
        }

        this.logger.log(`Initialized contracts for chain ${chainId}`);
      } catch (error) {
        this.logger.error(`Failed to initialize contracts for chain ${chainId}:`, error);
      }
    }
  }

  async createProject(chainId: number, params: CreateProjectParams): Promise<TransactionResult> {
    const contract = this.contracts.get(`musicHub_${chainId}`);
    if (!contract) {
      throw new Error(`Music Hub contract not found for chain ${chainId}`);
    }

    try {
      const tx = await contract.createProject({
        title: params.title,
        genre: params.genre,
        totalBudget: ethers.parseEther(params.totalBudget),
        deadline: params.deadline
      });

      const receipt = await tx.wait();
      
      return {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        logs: receipt.logs,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to create project:', error);
      throw error;
    }
  }

  async joinCollaboration(chainId: number, params: JoinCollaborationParams): Promise<TransactionResult> {
    const contract = this.contracts.get(`musicHub_${chainId}`);
    if (!contract) {
      throw new Error(`Music Hub contract not found for chain ${chainId}`);
    }

    try {
      const tx = await contract.joinCollaboration(
        params.projectId,
        params.agentAddress,
        params.workType,
        ethers.parseEther(params.proposedRate)
      );

      const receipt = await tx.wait();
      
      return {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        logs: receipt.logs,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to join collaboration:', error);
      throw error;
    }
  }

  async getProject(chainId: number, projectId: string): Promise<any> {
    const contract = this.contracts.get(`musicHub_${chainId}`);
    if (!contract) {
      throw new Error(`Music Hub contract not found for chain ${chainId}`);
    }

    try {
      const project = await contract.getProject(projectId);
      return {
        id: project.id.toString(),
        title: project.title,
        creator: project.creator,
        status: project.status,
        totalBudget: ethers.formatEther(project.totalBudget),
        deadline: new Date(Number(project.deadline) * 1000)
      };
    } catch (error) {
      this.logger.error('Failed to get project:', error);
      throw error;
    }
  }

  async registerAIAgent(chainId: number, name: string, specializations: string[], pricePerHour: string): Promise<TransactionResult> {
    const contract = this.contracts.get(`agentRegistry_${chainId}`);
    if (!contract) {
      throw new Error(`Agent Registry contract not found for chain ${chainId}`);
    }

    try {
      const tx = await contract.registerAgent(
        name,
        specializations,
        ethers.parseEther(pricePerHour)
      );

      const receipt = await tx.wait();
      
      return {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        logs: receipt.logs,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to register AI agent:', error);
      throw error;
    }
  }

  async getAIAgent(chainId: number, agentAddress: string): Promise<any> {
    const contract = this.contracts.get(`agentRegistry_${chainId}`);
    if (!contract) {
      throw new Error(`Agent Registry contract not found for chain ${chainId}`);
    }

    try {
      const agent = await contract.getAgent(agentAddress);
      return {
        id: agent.id.toString(),
        owner: agent.owner,
        name: agent.name,
        reputation: agent.reputation.toString(),
        pricePerHour: ethers.formatEther(agent.pricePerHour),
        isAvailable: agent.isAvailable
      };
    } catch (error) {
      this.logger.error('Failed to get AI agent:', error);
      throw error;
    }
  }

  async executeContractCall(params: ContractCallParams): Promise<TransactionResult> {
    const wallet = this.wallets.get(params.chainId);
    if (!wallet) {
      throw new Error(`Wallet not found for chain ${params.chainId}`);
    }

    try {
      const contract = new Contract(params.contractAddress, [], wallet);
      const tx = await contract[params.functionName](...params.args, {
        value: params.value ? ethers.parseEther(params.value) : undefined,
        gasLimit: params.gasLimit,
        gasPrice: params.gasPrice ? ethers.parseUnits(params.gasPrice, 'gwei') : undefined
      });

      const receipt = await tx.wait();
      
      return {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        logs: receipt.logs,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to execute contract call:', error);
      throw error;
    }
  }

  async getTransactionReceipt(chainId: number, txHash: string): Promise<any> {
    const provider = this.providers.get(chainId);
    if (!provider) {
      throw new Error(`Provider not found for chain ${chainId}`);
    }

    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      return receipt;
    } catch (error) {
      this.logger.error('Failed to get transaction receipt:', error);
      throw error;
    }
  }

  async estimateGas(params: ContractCallParams): Promise<string> {
    const provider = this.providers.get(params.chainId);
    if (!provider) {
      throw new Error(`Provider not found for chain ${params.chainId}`);
    }

    try {
      const contract = new Contract(params.contractAddress, [], provider);
      const gasEstimate = await contract[params.functionName].estimateGas(...params.args);
      return gasEstimate.toString();
    } catch (error) {
      this.logger.error('Failed to estimate gas:', error);
      throw error;
    }
  }

  getProvider(chainId: number): Provider | undefined {
    return this.providers.get(chainId);
  }

  getWallet(chainId: number): Wallet | undefined {
    return this.wallets.get(chainId);
  }

  getContract(key: string): Contract | undefined {
    return this.contracts.get(key);
  }
}