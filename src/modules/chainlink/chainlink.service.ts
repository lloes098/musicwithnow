import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, Contract } from 'ethers';
import { BlockchainService } from '../blockchain/blockchain.service';
import { 
  MusicTrendData, 
  AIPerformanceData, 
  PriceFeedData, 
  PriceFeedType 
} from '../../types/chainlink.types';
import { MusicGenre } from '../../types/music.types';
import { CHAINLINK_CONFIG, CHAINLINK_JOBS } from '../../config/chainlink.config';

const AGGREGATOR_V3_ABI = [
  {
    "inputs": [],
    "name": "latestRoundData",
    "outputs": [
      {"name": "roundId", "type": "uint80"},
      {"name": "answer", "type": "int256"},
      {"name": "startedAt", "type": "uint256"},
      {"name": "updatedAt", "type": "uint256"},
      {"name": "answeredInRound", "type": "uint80"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const FUNCTIONS_ROUTER_ABI = [
  {
    "inputs": [
      {"name": "subscriptionId", "type": "uint64"},
      {"name": "data", "type": "bytes"},
      {"name": "dataVersion", "type": "uint16"},
      {"name": "callbackGasLimit", "type": "uint32"},
      {"name": "donId", "type": "bytes32"}
    ],
    "name": "sendRequest",
    "outputs": [{"name": "requestId", "type": "bytes32"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

@Injectable()
export class ChainlinkService implements OnModuleInit {
  private readonly logger = new Logger(ChainlinkService.name);
  private priceFeeds: Map<string, Contract> = new Map();
  private functionsRouters: Map<number, Contract> = new Map();
  private musicTrendCache: Map<string, MusicTrendData> = new Map();
  private aiPerformanceCache: Map<string, AIPerformanceData> = new Map();

  constructor(
    private configService: ConfigService,
    private blockchainService: BlockchainService,
  ) {}

  async onModuleInit() {
    await this.initializePriceFeeds();
    await this.initializeFunctionsRouters();
    this.startDataFeedUpdates();
  }

  private async initializePriceFeeds() {
    for (const [chainName, config] of Object.entries(CHAINLINK_CONFIG)) {
      const chainId = this.getChainIdByName(chainName);
      const provider = this.blockchainService.getProvider(chainId);
      
      if (!provider || !config.aggregatorV3) continue;

      for (const [feedName, feedAddress] of Object.entries(config.aggregatorV3)) {
        try {
          const aggregator = new Contract(feedAddress, AGGREGATOR_V3_ABI, provider);
          this.priceFeeds.set(`${chainName}_${feedName}`, aggregator);
          this.logger.log(`Initialized price feed ${feedName} on ${chainName}`);
        } catch (error) {
          this.logger.error(`Failed to initialize price feed ${feedName} on ${chainName}:`, error);
        }
      }
    }
  }

  private async initializeFunctionsRouters() {
    for (const [chainName, config] of Object.entries(CHAINLINK_CONFIG)) {
      const chainId = this.getChainIdByName(chainName);
      const wallet = this.blockchainService.getWallet(chainId);
      
      if (!wallet || !config.functions) continue;

      try {
        const router = new Contract(config.functions.router, FUNCTIONS_ROUTER_ABI, wallet);
        this.functionsRouters.set(chainId, router);
        this.logger.log(`Initialized Functions router on ${chainName}`);
      } catch (error) {
        this.logger.error(`Failed to initialize Functions router on ${chainName}:`, error);
      }
    }
  }

  async getPriceFeedData(chainName: string, feedName: string): Promise<PriceFeedData> {
    const feed = this.priceFeeds.get(`${chainName}_${feedName}`);
    if (!feed) {
      throw new Error(`Price feed ${feedName} not found for chain ${chainName}`);
    }

    try {
      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await feed.latestRoundData();
      
      return {
        feedType: this.mapFeedNameToType(feedName),
        value: answer.toString(),
        decimals: 8, // Most Chainlink feeds use 8 decimals
        updatedAt: new Date(Number(updatedAt) * 1000),
        roundId: roundId.toString()
      };
    } catch (error) {
      this.logger.error(`Failed to get price feed data for ${feedName} on ${chainName}:`, error);
      throw error;
    }
  }

  async requestMusicTrendAnalysis(chainId: number, subscriptionId: number): Promise<string> {
    const router = this.functionsRouters.get(chainId);
    if (!router) {
      throw new Error(`Functions router not found for chain ${chainId}`);
    }

    try {
      const job = CHAINLINK_JOBS.musicTrendAnalysis;
      const chainConfig = this.getChainlinkConfigByChainId(chainId);
      
      const requestData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string[]', 'string', 'uint8'],
        [job.source, [], '', job.secretsLocation]
      );

      const tx = await router.sendRequest(
        subscriptionId,
        requestData,
        1, // Data version
        200000, // Callback gas limit
        ethers.encodeBytes32String(chainConfig.functions.donId)
      );

      const receipt = await tx.wait();
      const requestId = receipt.logs[0].topics[1]; // Extract request ID from logs
      
      this.logger.log(`Music trend analysis request sent: ${requestId}`);
      return requestId;
    } catch (error) {
      this.logger.error('Failed to request music trend analysis:', error);
      throw error;
    }
  }

  async requestAIPerformanceEvaluation(
    chainId: number, 
    subscriptionId: number, 
    agentAddress: string, 
    projectHistory: any[]
  ): Promise<string> {
    const router = this.functionsRouters.get(chainId);
    if (!router) {
      throw new Error(`Functions router not found for chain ${chainId}`);
    }

    try {
      const job = CHAINLINK_JOBS.aiPerformanceEvaluation;
      const chainConfig = this.getChainlinkConfigByChainId(chainId);
      
      const args = [agentAddress, JSON.stringify(projectHistory)];
      const requestData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string[]', 'string', 'uint8'],
        [job.source, args, '', job.secretsLocation]
      );

      const tx = await router.sendRequest(
        subscriptionId,
        requestData,
        1,
        300000, // Higher gas limit for AI evaluation
        ethers.encodeBytes32String(chainConfig.functions.donId)
      );

      const receipt = await tx.wait();
      const requestId = receipt.logs[0].topics[1];
      
      this.logger.log(`AI performance evaluation request sent: ${requestId}`);
      return requestId;
    } catch (error) {
      this.logger.error('Failed to request AI performance evaluation:', error);
      throw error;
    }
  }

  async requestMarketSentimentAnalysis(chainId: number, subscriptionId: number): Promise<string> {
    const router = this.functionsRouters.get(chainId);
    if (!router) {
      throw new Error(`Functions router not found for chain ${chainId}`);
    }

    try {
      const job = CHAINLINK_JOBS.marketSentimentAnalysis;
      const chainConfig = this.getChainlinkConfigByChainId(chainId);
      
      const requestData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string[]', 'string', 'uint8'],
        [job.source, [], '', job.secretsLocation]
      );

      const tx = await router.sendRequest(
        subscriptionId,
        requestData,
        1,
        250000,
        ethers.encodeBytes32String(chainConfig.functions.donId)
      );

      const receipt = await tx.wait();
      const requestId = receipt.logs[0].topics[1];
      
      this.logger.log(`Market sentiment analysis request sent: ${requestId}`);
      return requestId;
    } catch (error) {
      this.logger.error('Failed to request market sentiment analysis:', error);
      throw error;
    }
  }

  async getMusicTrendData(genre: MusicGenre): Promise<MusicTrendData | null> {
    return this.musicTrendCache.get(genre) || null;
  }

  async getAIPerformanceData(agentAddress: string): Promise<AIPerformanceData | null> {
    return this.aiPerformanceCache.get(agentAddress.toLowerCase()) || null;
  }

  updateMusicTrendData(data: MusicTrendData): void {
    this.musicTrendCache.set(data.genre, data);
    this.logger.log(`Updated music trend data for ${data.genre}: score ${data.trendScore}`);
  }

  updateAIPerformanceData(data: AIPerformanceData): void {
    this.aiPerformanceCache.set(data.agentAddress.toLowerCase(), data);
    this.logger.log(`Updated AI performance data for ${data.agentAddress}: score ${data.performanceScore}`);
  }

  async calculateDynamicPricing(
    basePrice: string, 
    genre: MusicGenre, 
    agentPerformance: number,
    marketSentiment: number
  ): Promise<string> {
    const trendData = await this.getMusicTrendData(genre);
    const trendMultiplier = trendData ? trendData.trendScore / 100 : 1;
    const performanceMultiplier = agentPerformance / 100;
    const sentimentMultiplier = marketSentiment / 100;
    
    const basePriceNum = parseFloat(basePrice);
    const dynamicPrice = basePriceNum * trendMultiplier * performanceMultiplier * sentimentMultiplier;
    
    return Math.max(dynamicPrice, basePriceNum * 0.5).toFixed(6); // Min 50% of base price
  }

  async getQualityScore(audioFileHash: string, genre: MusicGenre): Promise<number> {
    // Mock implementation - in production, this would analyze the audio file
    const trendData = await this.getMusicTrendData(genre);
    const baseScore = 75; // Base quality score
    const trendBonus = trendData ? (trendData.trendScore - 50) * 0.3 : 0;
    
    return Math.min(100, Math.max(0, baseScore + trendBonus + (Math.random() * 20 - 10)));
  }

  private startDataFeedUpdates() {
    setInterval(async () => {
      await this.updateAllPriceFeeds();
    }, 60000); // Update every minute
  }

  private async updateAllPriceFeeds() {
    for (const [feedKey, _] of this.priceFeeds.entries()) {
      try {
        const [chainName, feedName] = feedKey.split('_');
        await this.getPriceFeedData(chainName, feedName);
      } catch (error) {
        this.logger.error(`Failed to update price feed ${feedKey}:`, error);
      }
    }
  }

  private getChainIdByName(chainName: string): number {
    switch (chainName) {
      case 'ethereum': return 1;
      case 'monad': return 60808;
      case 'base': return 8453;
      case 'arbitrum': return 42161;
      default: throw new Error(`Unknown chain name: ${chainName}`);
    }
  }

  private getChainlinkConfigByChainId(chainId: number): any {
    switch (chainId) {
      case 1: return CHAINLINK_CONFIG.ethereum;
      case 8453: return CHAINLINK_CONFIG.base;
      case 42161: return CHAINLINK_CONFIG.arbitrum;
      default: throw new Error(`Chainlink config not found for chain ${chainId}`);
    }
  }

  private mapFeedNameToType(feedName: string): PriceFeedType {
    switch (feedName.toUpperCase()) {
      case 'ETHUSD':
      case 'BTCUSD':
      case 'LINKUSD':
      case 'USDCUSD':
        return PriceFeedType.AI_SERVICE_PRICE;
      default:
        return PriceFeedType.MUSIC_TREND_INDEX;
    }
  }
}