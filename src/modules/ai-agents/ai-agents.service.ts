import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ChainlinkService } from '../chainlink/chainlink.service';
import { WebSocketService } from '../websocket/websocket.service';
import { AIAgent, AISpecialization } from '../../types/music.types';
import { RegisterAgentDto } from './dto/register-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

export interface AgentPortfolio {
  agentId: string;
  completedProjects: number;
  totalEarnings: string;
  averageRating: number;
  recentWork: {
    projectId: string;
    projectTitle: string;
    workType: string;
    completedAt: Date;
    rating: number;
  }[];
  testimonials: {
    from: string;
    message: string;
    rating: number;
    date: Date;
  }[];
}

export interface AgentMatchingCriteria {
  specializations: AISpecialization[];
  maxPricePerHour: string;
  minReputation: number;
  availability: boolean;
  chainId?: number;
}

@Injectable()
export class AIAgentsService {
  private readonly logger = new Logger(AIAgentsService.name);
  private agents: Map<string, AIAgent> = new Map();
  private agentsByAddress: Map<string, string> = new Map();
  private agentsByChain: Map<number, string[]> = new Map();
  private agentPortfolios: Map<string, AgentPortfolio> = new Map();

  constructor(
    private configService: ConfigService,
    private blockchainService: BlockchainService,
    private chainlinkService: ChainlinkService,
    private webSocketService: WebSocketService,
  ) {}

  async registerAgent(registerDto: RegisterAgentDto): Promise<AIAgent> {
    try {
      // Check if agent already exists
      if (this.agentsByAddress.has(registerDto.address.toLowerCase())) {
        throw new BadRequestException(`Agent already registered with address ${registerDto.address}`);
      }

      // Register on blockchain
      const blockchainResult = await this.blockchainService.registerAIAgent(
        registerDto.chainId,
        registerDto.name,
        registerDto.specialization,
        registerDto.pricePerHour
      );

      // Create agent record
      const agentId = uuidv4();
      const agent: AIAgent = {
        id: agentId,
        address: registerDto.address,
        name: registerDto.name,
        chainId: registerDto.chainId,
        specialization: registerDto.specialization,
        reputation: 75, // Starting reputation
        pricePerHour: registerDto.pricePerHour,
        isAvailable: true,
        lastActiveAt: new Date(),
      };

      // Store agent
      this.agents.set(agentId, agent);
      this.agentsByAddress.set(registerDto.address.toLowerCase(), agentId);

      // Index by chain
      const chainAgents = this.agentsByChain.get(registerDto.chainId) || [];
      chainAgents.push(agentId);
      this.agentsByChain.set(registerDto.chainId, chainAgents);

      // Create initial portfolio
      const portfolio: AgentPortfolio = {
        agentId,
        completedProjects: 0,
        totalEarnings: '0',
        averageRating: 0,
        recentWork: [],
        testimonials: [],
      };
      this.agentPortfolios.set(agentId, portfolio);

      this.logger.log(`Registered AI agent: ${registerDto.name} (${registerDto.address})`);
      return agent;
    } catch (error) {
      this.logger.error('Failed to register AI agent:', error);
      throw error;
    }
  }

  async getAgent(agentId: string): Promise<AIAgent> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new NotFoundException(`Agent not found: ${agentId}`);
    }
    return agent;
  }

  async getAgentByAddress(address: string): Promise<AIAgent> {
    const agentId = this.agentsByAddress.get(address.toLowerCase());
    if (!agentId) {
      throw new NotFoundException(`Agent not found with address: ${address}`);
    }
    return this.getAgent(agentId);
  }

  async updateAgent(agentId: string, updateDto: UpdateAgentDto): Promise<AIAgent> {
    const agent = await this.getAgent(agentId);

    // Update fields
    if (updateDto.name) agent.name = updateDto.name;
    if (updateDto.specialization) agent.specialization = updateDto.specialization;
    if (updateDto.pricePerHour) agent.pricePerHour = updateDto.pricePerHour;
    if (updateDto.isAvailable !== undefined) agent.isAvailable = updateDto.isAvailable;

    agent.lastActiveAt = new Date();

    this.logger.log(`Updated AI agent: ${agentId}`);
    return agent;
  }

  async getAgentsByChain(chainId: number): Promise<AIAgent[]> {
    const agentIds = this.agentsByChain.get(chainId) || [];
    return agentIds.map(id => this.agents.get(id)).filter(Boolean) as AIAgent[];
  }

  async getAgentsBySpecialization(specialization: AISpecialization): Promise<AIAgent[]> {
    return Array.from(this.agents.values()).filter(agent =>
      agent.specialization.includes(specialization)
    );
  }

  async searchAgents(criteria: AgentMatchingCriteria): Promise<AIAgent[]> {
    let agents = Array.from(this.agents.values());

    // Filter by specializations
    if (criteria.specializations && criteria.specializations.length > 0) {
      agents = agents.filter(agent =>
        criteria.specializations.some(spec => agent.specialization.includes(spec))
      );
    }

    // Filter by max price
    if (criteria.maxPricePerHour) {
      const maxPrice = parseFloat(criteria.maxPricePerHour);
      agents = agents.filter(agent => parseFloat(agent.pricePerHour) <= maxPrice);
    }

    // Filter by minimum reputation
    if (criteria.minReputation) {
      agents = agents.filter(agent => agent.reputation >= criteria.minReputation);
    }

    // Filter by availability
    if (criteria.availability !== undefined) {
      agents = agents.filter(agent => agent.isAvailable === criteria.availability);
    }

    // Filter by chain
    if (criteria.chainId) {
      agents = agents.filter(agent => agent.chainId === criteria.chainId);
    }

    // Sort by reputation (descending) and price (ascending)
    agents.sort((a, b) => {
      const reputationDiff = b.reputation - a.reputation;
      if (reputationDiff !== 0) return reputationDiff;
      return parseFloat(a.pricePerHour) - parseFloat(b.pricePerHour);
    });

    return agents;
  }

  async getAgentPortfolio(agentId: string): Promise<AgentPortfolio> {
    const portfolio = this.agentPortfolios.get(agentId);
    if (!portfolio) {
      throw new NotFoundException(`Portfolio not found for agent: ${agentId}`);
    }

    // Update with latest Chainlink performance data
    const agent = await this.getAgent(agentId);
    const performanceData = await this.chainlinkService.getAIPerformanceData(agent.address);

    if (performanceData) {
      portfolio.completedProjects = performanceData.totalProjects;
      portfolio.averageRating = performanceData.averageQuality;
      agent.reputation = performanceData.performanceScore;
    }

    return portfolio;
  }

  async updateAgentPerformance(
    agentAddress: string,
    projectId: string,
    projectTitle: string,
    workType: string,
    rating: number,
    earnings: string
  ): Promise<void> {
    try {
      const agent = await this.getAgentByAddress(agentAddress);
      const portfolio = this.agentPortfolios.get(agent.id);
      
      if (portfolio) {
        // Update portfolio
        portfolio.completedProjects++;
        portfolio.totalEarnings = (parseFloat(portfolio.totalEarnings) + parseFloat(earnings)).toString();
        
        // Add recent work
        portfolio.recentWork.unshift({
          projectId,
          projectTitle,
          workType,
          completedAt: new Date(),
          rating,
        });

        // Keep only last 10 works
        if (portfolio.recentWork.length > 10) {
          portfolio.recentWork = portfolio.recentWork.slice(0, 10);
        }

        // Update average rating
        const totalRating = portfolio.recentWork.reduce((sum, work) => sum + work.rating, 0);
        portfolio.averageRating = totalRating / portfolio.recentWork.length;

        // Update agent reputation
        agent.reputation = Math.min(100, Math.max(0, portfolio.averageRating * 20)); // Scale 0-5 rating to 0-100
      }

      // Request Chainlink performance evaluation
      await this.chainlinkService.requestAIPerformanceEvaluation(
        agent.chainId,
        1, // subscription ID - should be configurable
        agentAddress,
        portfolio?.recentWork || []
      );

      this.logger.log(`Updated performance for agent ${agentAddress}`);
    } catch (error) {
      this.logger.error(`Failed to update agent performance: ${error.message}`);
    }
  }

  async addTestimonial(
    agentId: string,
    from: string,
    message: string,
    rating: number
  ): Promise<void> {
    const portfolio = this.agentPortfolios.get(agentId);
    if (!portfolio) {
      throw new NotFoundException(`Portfolio not found for agent: ${agentId}`);
    }

    portfolio.testimonials.unshift({
      from,
      message,
      rating,
      date: new Date(),
    });

    // Keep only last 20 testimonials
    if (portfolio.testimonials.length > 20) {
      portfolio.testimonials = portfolio.testimonials.slice(0, 20);
    }

    this.logger.log(`Added testimonial for agent ${agentId}`);
  }

  async getTopAgents(limit: number = 10): Promise<AIAgent[]> {
    const agents = Array.from(this.agents.values());
    
    // Sort by reputation and recent activity
    return agents
      .sort((a, b) => {
        const reputationDiff = b.reputation - a.reputation;
        if (reputationDiff !== 0) return reputationDiff;
        
        // Secondary sort by last active time
        return b.lastActiveAt.getTime() - a.lastActiveAt.getTime();
      })
      .slice(0, limit);
  }

  async getAgentAnalytics(agentId: string): Promise<any> {
    const agent = await this.getAgent(agentId);
    const portfolio = await this.getAgentPortfolio(agentId);

    // Calculate earnings by month
    const monthlyEarnings = this.calculateMonthlyEarnings(portfolio);

    // Calculate specialization distribution
    const specializationStats = this.calculateSpecializationStats(portfolio);

    // Calculate performance trends
    const performanceTrend = this.calculatePerformanceTrend(portfolio);

    return {
      agentId,
      name: agent.name,
      address: agent.address,
      reputation: agent.reputation,
      isAvailable: agent.isAvailable,
      totalProjects: portfolio.completedProjects,
      totalEarnings: portfolio.totalEarnings,
      averageRating: portfolio.averageRating,
      monthlyEarnings,
      specializationStats,
      performanceTrend,
      lastActive: agent.lastActiveAt,
    };
  }

  async setAgentAvailability(agentId: string, isAvailable: boolean): Promise<AIAgent> {
    const agent = await this.getAgent(agentId);
    agent.isAvailable = isAvailable;
    agent.lastActiveAt = new Date();

    this.logger.log(`Set agent ${agentId} availability to ${isAvailable}`);
    return agent;
  }

  async getAgentCollaborationHistory(agentId: string): Promise<any[]> {
    const portfolio = await this.getAgentPortfolio(agentId);
    return portfolio.recentWork;
  }

  getAllAgents(): AIAgent[] {
    return Array.from(this.agents.values());
  }

  getAgentStats(): any {
    const totalAgents = this.agents.size;
    const activeAgents = Array.from(this.agents.values()).filter(a => a.isAvailable).length;
    const agentsByChain = Array.from(this.agentsByChain.entries()).map(([chainId, agents]) => ({
      chainId,
      count: agents.length,
    }));

    const specializationCounts = new Map<AISpecialization, number>();
    this.agents.forEach(agent => {
      agent.specialization.forEach(spec => {
        specializationCounts.set(spec, (specializationCounts.get(spec) || 0) + 1);
      });
    });

    return {
      totalAgents,
      activeAgents,
      agentsByChain,
      specializationDistribution: Array.from(specializationCounts.entries()).map(([spec, count]) => ({
        specialization: spec,
        count,
      })),
      timestamp: new Date(),
    };
  }

  private calculateMonthlyEarnings(portfolio: AgentPortfolio): any[] {
    const monthlyData = new Map<string, number>();
    
    portfolio.recentWork.forEach(work => {
      const month = work.completedAt.toISOString().slice(0, 7); // YYYY-MM format
      // Mock earnings calculation - in real implementation, this would be stored
      const earnings = Math.random() * 1000; // Random earnings for demo
      monthlyData.set(month, (monthlyData.get(month) || 0) + earnings);
    });

    return Array.from(monthlyData.entries())
      .map(([month, earnings]) => ({ month, earnings }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private calculateSpecializationStats(portfolio: AgentPortfolio): any[] {
    const specializationCounts = new Map<string, number>();
    
    portfolio.recentWork.forEach(work => {
      specializationCounts.set(work.workType, (specializationCounts.get(work.workType) || 0) + 1);
    });

    return Array.from(specializationCounts.entries()).map(([type, count]) => ({
      workType: type,
      count,
      percentage: (count / portfolio.recentWork.length) * 100,
    }));
  }

  private calculatePerformanceTrend(portfolio: AgentPortfolio): any[] {
    // Calculate 30-day rolling average of ratings
    const sortedWork = portfolio.recentWork.sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
    const trends = [];
    
    for (let i = 0; i < sortedWork.length; i++) {
      const endIndex = Math.min(i + 5, sortedWork.length); // 5-project rolling window
      const window = sortedWork.slice(i, endIndex);
      const averageRating = window.reduce((sum, work) => sum + work.rating, 0) / window.length;
      
      trends.push({
        date: sortedWork[i].completedAt,
        averageRating,
        projectCount: window.length,
      });
    }

    return trends;
  }
}