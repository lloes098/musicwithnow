import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, Contract } from 'ethers';
import { BlockchainService } from '../blockchain/blockchain.service';
import { 
  CCIPMessage, 
  CCIPMessageType, 
  CCIPMessageData, 
  MessageStatus 
} from '../../types/ccip.types';
import { CCIPSendParams, TransactionResult } from '../../types/blockchain.types';
import { CHAIN_SELECTORS } from '../../config/chains.config';
import { CCIP_ROUTER_ABI } from '../../config/contracts.config';

@Injectable()
export class CCIPService implements OnModuleInit {
  private readonly logger = new Logger(CCIPService.name);
  private messageQueue: Map<string, CCIPMessage> = new Map();
  private retryQueue: Map<string, { message: CCIPMessage; attempts: number }> = new Map();
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  constructor(
    private configService: ConfigService,
    private blockchainService: BlockchainService,
  ) {}

  async onModuleInit() {
    this.startMessageProcessor();
    this.startRetryProcessor();
  }

  async sendCrossChainMessage(
    sourceChainId: number,
    destinationChainId: number,
    messageType: CCIPMessageType,
    data: CCIPMessageData,
    recipient: string,
    projectId?: string
  ): Promise<string> {
    const messageId = this.generateMessageId();
    
    const message: CCIPMessage = {
      messageId,
      projectId: projectId || '',
      sourceChain: sourceChainId,
      destinationChain: destinationChainId,
      messageType,
      sender: await this.getSenderAddress(sourceChainId),
      recipient,
      data,
      gasLimit: this.calculateGasLimit(messageType, data),
      timestamp: new Date(),
      status: MessageStatus.PENDING
    };

    this.messageQueue.set(messageId, message);
    this.logger.log(`Queued cross-chain message ${messageId} from chain ${sourceChainId} to ${destinationChainId}`);
    
    return messageId;
  }

  async sendCollaborationRequest(
    sourceChainId: number,
    destinationChainId: number,
    projectId: string,
    workType: string,
    budget: string,
    deadline: number,
    requirements: string,
    recipientAgent: string
  ): Promise<string> {
    const data: CCIPMessageData = {
      collaborationRequest: {
        workType: workType as any,
        budget,
        deadline,
        requirements
      }
    };

    return this.sendCrossChainMessage(
      sourceChainId,
      destinationChainId,
      CCIPMessageType.COLLABORATION_REQUEST,
      data,
      recipientAgent,
      projectId
    );
  }

  async sendWorkProgress(
    sourceChainId: number,
    destinationChainId: number,
    projectId: string,
    progress: number,
    currentStage: string,
    estimatedCompletion: number,
    recipient: string
  ): Promise<string> {
    const data: CCIPMessageData = {
      progressUpdate: {
        percentage: progress,
        currentStage,
        estimatedCompletion
      }
    };

    return this.sendCrossChainMessage(
      sourceChainId,
      destinationChainId,
      CCIPMessageType.WORK_PROGRESS,
      data,
      recipient,
      projectId
    );
  }

  async sendFileShare(
    sourceChainId: number,
    destinationChainId: number,
    projectId: string,
    audioFileHash: string,
    metadata: any,
    recipient: string
  ): Promise<string> {
    const data: CCIPMessageData = {
      audioFileHash,
      metadata
    };

    return this.sendCrossChainMessage(
      sourceChainId,
      destinationChainId,
      CCIPMessageType.FILE_SHARE,
      data,
      recipient,
      projectId
    );
  }

  async sendPaymentInstruction(
    sourceChainId: number,
    destinationChainId: number,
    projectId: string,
    amount: string,
    token: string,
    recipient: string
  ): Promise<string> {
    const data: CCIPMessageData = {
      paymentInfo: {
        amount,
        token,
        recipient
      }
    };

    return this.sendCrossChainMessage(
      sourceChainId,
      destinationChainId,
      CCIPMessageType.PAYMENT_INSTRUCTION,
      data,
      recipient,
      projectId
    );
  }

  private async processCCIPMessage(message: CCIPMessage): Promise<void> {
    try {
      const contract = this.blockchainService.getContract(`ccipRouter_${message.sourceChain}`);
      if (!contract) {
        throw new Error(`CCIP Router not found for chain ${message.sourceChain}`);
      }

      const destinationSelector = this.getChainSelector(message.destinationChain);
      const encodedData = this.encodeMessageData(message.data, message.messageType);
      
      const ccipMessage = {
        receiver: ethers.AbiCoder.defaultAbiCoder().encode(['address'], [message.recipient]),
        data: encodedData,
        tokenAmounts: [], // No tokens for now
        feeToken: ethers.ZeroAddress, // Pay in native token
        extraArgs: '0x' // Default extra args
      };

      // Calculate fee first
      const fee = await contract.getFee(destinationSelector, ccipMessage);
      
      // Send the message
      const tx = await contract.ccipSend(ccipMessage, destinationSelector, {
        value: fee
      });

      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        message.status = MessageStatus.SENT;
        message.txHash = tx.hash;
        this.logger.log(`Successfully sent CCIP message ${message.messageId}`);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      this.logger.error(`Failed to process CCIP message ${message.messageId}:`, error);
      message.status = MessageStatus.FAILED;
      
      // Add to retry queue if not exceeded max attempts
      const retryInfo = this.retryQueue.get(message.messageId) || { message, attempts: 0 };
      if (retryInfo.attempts < this.MAX_RETRY_ATTEMPTS) {
        retryInfo.attempts++;
        this.retryQueue.set(message.messageId, retryInfo);
        this.logger.log(`Added message ${message.messageId} to retry queue (attempt ${retryInfo.attempts})`);
      }
    }
  }

  private async startMessageProcessor() {
    setInterval(async () => {
      const pendingMessages = Array.from(this.messageQueue.values()).filter(
        msg => msg.status === MessageStatus.PENDING
      );

      for (const message of pendingMessages) {
        await this.processCCIPMessage(message);
      }
    }, 2000); // Process every 2 seconds
  }

  private async startRetryProcessor() {
    setInterval(async () => {
      for (const [messageId, retryInfo] of this.retryQueue.entries()) {
        if (Date.now() - retryInfo.message.timestamp.getTime() > this.RETRY_DELAY * retryInfo.attempts) {
          retryInfo.message.status = MessageStatus.PENDING;
          this.messageQueue.set(messageId, retryInfo.message);
          this.retryQueue.delete(messageId);
          this.logger.log(`Retrying message ${messageId} (attempt ${retryInfo.attempts})`);
        }
      }
    }, 3000); // Check for retries every 3 seconds
  }

  private generateMessageId(): string {
    return `ccip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getSenderAddress(chainId: number): Promise<string> {
    const wallet = this.blockchainService.getWallet(chainId);
    return wallet ? wallet.address : '';
  }

  private getChainSelector(chainId: number): string {
    switch (chainId) {
      case 1: return CHAIN_SELECTORS.ethereum;
      case 60808: return CHAIN_SELECTORS.monad;
      case 8453: return CHAIN_SELECTORS.base;
      case 42161: return CHAIN_SELECTORS.arbitrum;
      default: throw new Error(`Unsupported chain ID: ${chainId}`);
    }
  }

  private calculateGasLimit(messageType: CCIPMessageType, data: CCIPMessageData): number {
    let baseGas = 100000;
    
    switch (messageType) {
      case CCIPMessageType.COLLABORATION_REQUEST:
        return baseGas + 50000;
      case CCIPMessageType.FILE_SHARE:
        return baseGas + 30000;
      case CCIPMessageType.PAYMENT_INSTRUCTION:
        return baseGas + 80000;
      case CCIPMessageType.WORK_PROGRESS:
        return baseGas + 20000;
      case CCIPMessageType.PROJECT_COMPLETION:
        return baseGas + 40000;
      case CCIPMessageType.QUALITY_EVALUATION:
        return baseGas + 60000;
      default:
        return baseGas;
    }
  }

  private encodeMessageData(data: CCIPMessageData, messageType: CCIPMessageType): string {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    
    switch (messageType) {
      case CCIPMessageType.COLLABORATION_REQUEST:
        return abiCoder.encode(
          ['string', 'string', 'uint256', 'string'],
          [
            data.collaborationRequest?.workType || '',
            data.collaborationRequest?.budget || '0',
            data.collaborationRequest?.deadline || 0,
            data.collaborationRequest?.requirements || ''
          ]
        );
      
      case CCIPMessageType.FILE_SHARE:
        return abiCoder.encode(
          ['string', 'string', 'uint256', 'string', 'string'],
          [
            data.audioFileHash || '',
            data.metadata?.genre || '',
            data.metadata?.tempo || 0,
            data.metadata?.key || '',
            data.metadata?.mood || ''
          ]
        );
      
      case CCIPMessageType.WORK_PROGRESS:
        return abiCoder.encode(
          ['uint256', 'string', 'uint256'],
          [
            data.progressUpdate?.percentage || 0,
            data.progressUpdate?.currentStage || '',
            data.progressUpdate?.estimatedCompletion || 0
          ]
        );
      
      case CCIPMessageType.PAYMENT_INSTRUCTION:
        return abiCoder.encode(
          ['string', 'string', 'string'],
          [
            data.paymentInfo?.amount || '0',
            data.paymentInfo?.token || '',
            data.paymentInfo?.recipient || ''
          ]
        );
      
      default:
        return abiCoder.encode(['string'], [JSON.stringify(data)]);
    }
  }

  getMessage(messageId: string): CCIPMessage | undefined {
    return this.messageQueue.get(messageId);
  }

  getMessagesByProject(projectId: string): CCIPMessage[] {
    return Array.from(this.messageQueue.values()).filter(
      msg => msg.projectId === projectId
    );
  }

  getMessagesByStatus(status: MessageStatus): CCIPMessage[] {
    return Array.from(this.messageQueue.values()).filter(
      msg => msg.status === status
    );
  }

  async getMessageFee(
    sourceChainId: number, 
    destinationChainId: number, 
    messageType: CCIPMessageType, 
    data: CCIPMessageData
  ): Promise<string> {
    const contract = this.blockchainService.getContract(`ccipRouter_${sourceChainId}`);
    if (!contract) {
      throw new Error(`CCIP Router not found for chain ${sourceChainId}`);
    }

    const destinationSelector = this.getChainSelector(destinationChainId);
    const encodedData = this.encodeMessageData(data, messageType);
    
    const ccipMessage = {
      receiver: ethers.AbiCoder.defaultAbiCoder().encode(['address'], [ethers.ZeroAddress]),
      data: encodedData,
      tokenAmounts: [],
      feeToken: ethers.ZeroAddress,
      extraArgs: '0x'
    };

    const fee = await contract.getFee(destinationSelector, ccipMessage);
    return ethers.formatEther(fee);
  }
}