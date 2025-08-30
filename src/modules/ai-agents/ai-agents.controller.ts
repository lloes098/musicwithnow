import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AIAgentsService, AgentMatchingCriteria } from './ai-agents.service';
import { RegisterAgentDto } from './dto/register-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { AIAgent, AISpecialization } from '../../types/music.types';

@ApiTags('AI Agents')
@Controller('api/v1/agents')
export class AIAgentsController {
  private readonly logger = new Logger(AIAgentsController.name);

  constructor(private readonly aiAgentsService: AIAgentsService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new AI agent' })
  @ApiResponse({ status: 201, description: 'Agent registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or agent already exists' })
  async registerAgent(@Body() registerAgentDto: RegisterAgentDto): Promise<AIAgent> {
    this.logger.log(`Registering AI agent: ${registerAgentDto.name}`);
    return this.aiAgentsService.registerAgent(registerAgentDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent by ID' })
  @ApiResponse({ status: 200, description: 'Agent found' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getAgent(@Param('id') id: string): Promise<AIAgent> {
    return this.aiAgentsService.getAgent(id);
  }

  @Get('address/:address')
  @ApiOperation({ summary: 'Get agent by wallet address' })
  @ApiResponse({ status: 200, description: 'Agent found' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getAgentByAddress(@Param('address') address: string): Promise<AIAgent> {
    return this.aiAgentsService.getAgentByAddress(address);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update agent information' })
  @ApiResponse({ status: 200, description: 'Agent updated successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async updateAgent(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
  ): Promise<AIAgent> {
    this.logger.log(`Updating AI agent: ${id}`);
    return this.aiAgentsService.updateAgent(id, updateAgentDto);
  }

  @Put(':id/availability')
  @ApiOperation({ summary: 'Update agent availability status' })
  @ApiResponse({ status: 200, description: 'Availability updated' })
  async updateAvailability(
    @Param('id') id: string,
    @Body('isAvailable') isAvailable: boolean,
  ): Promise<AIAgent> {
    this.logger.log(`Updating agent ${id} availability to ${isAvailable}`);
    return this.aiAgentsService.setAgentAvailability(id, isAvailable);
  }

  @Get()
  @ApiOperation({ summary: 'Search and filter agents' })
  @ApiQuery({ name: 'specialization', required: false, enum: AISpecialization })
  @ApiQuery({ name: 'chainId', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: String })
  @ApiQuery({ name: 'minReputation', required: false, type: Number })
  @ApiQuery({ name: 'available', required: false, type: Boolean })
  @ApiQuery({ name: 'top', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Agents retrieved' })
  async searchAgents(
    @Query('specialization') specialization?: AISpecialization,
    @Query('chainId') chainId?: number,
    @Query('maxPrice') maxPrice?: string,
    @Query('minReputation') minReputation?: number,
    @Query('available') available?: boolean,
    @Query('top') top?: boolean,
    @Query('limit') limit?: number,
  ): Promise<AIAgent[]> {
    if (top) {
      return this.aiAgentsService.getTopAgents(limit || 10);
    }

    if (specialization && !chainId && !maxPrice && !minReputation && available === undefined) {
      return this.aiAgentsService.getAgentsBySpecialization(specialization);
    }

    if (chainId && !specialization && !maxPrice && !minReputation && available === undefined) {
      return this.aiAgentsService.getAgentsByChain(chainId);
    }

    const criteria: AgentMatchingCriteria = {
      specializations: specialization ? [specialization] : [],
      maxPricePerHour: maxPrice || '',
      minReputation: minReputation || 0,
      availability: available || false,
      chainId,
    };

    return this.aiAgentsService.searchAgents(criteria);
  }

  @Get('specialization/:specialization')
  @ApiOperation({ summary: 'Get agents by specialization' })
  @ApiResponse({ status: 200, description: 'Agents retrieved by specialization' })
  async getAgentsBySpecialization(
    @Param('specialization') specialization: AISpecialization,
  ): Promise<AIAgent[]> {
    return this.aiAgentsService.getAgentsBySpecialization(specialization);
  }

  @Get('chain/:chainId')
  @ApiOperation({ summary: 'Get agents by chain ID' })
  @ApiResponse({ status: 200, description: 'Agents retrieved by chain' })
  async getAgentsByChain(@Param('chainId') chainId: number): Promise<AIAgent[]> {
    return this.aiAgentsService.getAgentsByChain(chainId);
  }

  @Get(':id/portfolio')
  @ApiOperation({ summary: 'Get agent portfolio and performance history' })
  @ApiResponse({ status: 200, description: 'Portfolio retrieved' })
  async getAgentPortfolio(@Param('id') id: string) {
    return this.aiAgentsService.getAgentPortfolio(id);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get detailed agent analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
  async getAgentAnalytics(@Param('id') id: string) {
    return this.aiAgentsService.getAgentAnalytics(id);
  }

  @Get(':id/collaborations')
  @ApiOperation({ summary: 'Get agent collaboration history' })
  @ApiResponse({ status: 200, description: 'Collaboration history retrieved' })
  async getAgentCollaborations(@Param('id') id: string) {
    const history = await this.aiAgentsService.getAgentCollaborationHistory(id);
    return {
      agentId: id,
      collaborations: history,
      totalCollaborations: history.length,
    };
  }

  @Post(':id/testimonials')
  @ApiOperation({ summary: 'Add a testimonial for an agent' })
  @ApiResponse({ status: 201, description: 'Testimonial added' })
  async addTestimonial(
    @Param('id') id: string,
    @Body() body: { from: string; message: string; rating: number },
  ) {
    if (!body.from || !body.message || !body.rating) {
      throw new BadRequestException('From, message, and rating are required');
    }

    if (body.rating < 1 || body.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    await this.aiAgentsService.addTestimonial(id, body.from, body.message, body.rating);
    
    return {
      agentId: id,
      message: 'Testimonial added successfully',
      timestamp: new Date(),
    };
  }

  @Post(':id/performance')
  @ApiOperation({ summary: 'Update agent performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance updated' })
  async updatePerformance(
    @Param('id') id: string,
    @Body() body: {
      projectId: string;
      projectTitle: string;
      workType: string;
      rating: number;
      earnings: string;
    },
  ) {
    const agent = await this.aiAgentsService.getAgent(id);
    
    await this.aiAgentsService.updateAgentPerformance(
      agent.address,
      body.projectId,
      body.projectTitle,
      body.workType,
      body.rating,
      body.earnings,
    );

    return {
      agentId: id,
      message: 'Performance updated successfully',
      timestamp: new Date(),
    };
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get platform agent statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getAgentStats() {
    return this.aiAgentsService.getAgentStats();
  }

  @Get('top/performers')
  @ApiOperation({ summary: 'Get top performing agents' })
  @ApiResponse({ status: 200, description: 'Top agents retrieved' })
  async getTopAgents(@Query('limit') limit?: number) {
    return this.aiAgentsService.getTopAgents(limit || 10);
  }

  @Post('match')
  @ApiOperation({ summary: 'Find agents matching specific criteria' })
  @ApiResponse({ status: 200, description: 'Matching agents found' })
  async matchAgents(@Body() criteria: AgentMatchingCriteria): Promise<AIAgent[]> {
    this.logger.log(`Matching agents with criteria: ${JSON.stringify(criteria)}`);
    return this.aiAgentsService.searchAgents(criteria);
  }

  @Get('available/now')
  @ApiOperation({ summary: 'Get all currently available agents' })
  @ApiResponse({ status: 200, description: 'Available agents retrieved' })
  async getAvailableAgents(): Promise<AIAgent[]> {
    const criteria: AgentMatchingCriteria = {
      specializations: [],
      maxPricePerHour: '',
      minReputation: 0,
      availability: true,
    };

    return this.aiAgentsService.searchAgents(criteria);
  }

  @Get(':id/recommendations')
  @ApiOperation({ summary: 'Get project recommendations for an agent' })
  @ApiResponse({ status: 200, description: 'Recommendations generated' })
  async getAgentRecommendations(@Param('id') id: string) {
    const agent = await this.aiAgentsService.getAgent(id);
    
    // Mock recommendations based on agent's specializations
    // In a real implementation, this would use ML algorithms and market data
    const recommendations = {
      agentId: id,
      recommendedProjects: [
        {
          projectId: 'mock-project-1',
          title: 'Electronic Music Collaboration',
          genre: 'electronic',
          matchScore: 95,
          estimatedEarnings: '500',
          reason: 'Perfect match for your electronic music production skills',
        },
        {
          projectId: 'mock-project-2',
          title: 'Hip-Hop Beat Production',
          genre: 'hip_hop',
          matchScore: 87,
          estimatedEarnings: '300',
          reason: 'High demand for your rhythm section expertise',
        },
      ],
      marketTrends: {
        hotGenres: ['electronic', 'lo_fi', 'afrobeats'],
        priceRange: '200-800 USDC',
        demandLevel: 'high',
      },
      timestamp: new Date(),
    };

    return recommendations;
  }
}