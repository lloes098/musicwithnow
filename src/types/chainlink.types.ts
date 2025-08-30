import { MusicGenre } from './music.types';

export interface MusicTrendData {
  id: string;
  genre: MusicGenre;
  trendScore: number;
  viralCoefficient: number;
  emotionIndex: number;
  marketSentiment: number;
  timestamp: Date;
  source: string;
}

export interface AIPerformanceData {
  agentAddress: string;
  chainId: number;
  performanceScore: number;
  completionRate: number;
  averageQuality: number;
  collaborationSuccessRate: number;
  totalProjects: number;
  lastUpdated: Date;
}

export interface PriceFeedData {
  feedType: PriceFeedType;
  value: string;
  decimals: number;
  updatedAt: Date;
  roundId: string;
}

export enum PriceFeedType {
  MUSIC_TREND_INDEX = 'music_trend_index',
  AI_SERVICE_PRICE = 'ai_service_price',
  COLLABORATION_SUCCESS_RATE = 'collaboration_success_rate',
  MARKET_SENTIMENT = 'market_sentiment'
}