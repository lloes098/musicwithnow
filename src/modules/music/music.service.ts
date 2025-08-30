import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CCIPService } from '../ccip/ccip.service';
import { ChainlinkService } from '../chainlink/chainlink.service';
import { IPFSService } from '../ipfs/ipfs.service';
import { WebSocketService } from '../websocket/websocket.service';
import { 
  MusicProject, 
  ProjectStatus, 
  AudioFile, 
  ContributionRate,
  MusicGenre,
  WorkType 
} from '../../types/music.types';
import { CCIPMessageType } from '../../types/ccip.types';
import { CreateProjectDto } from './dto/create-project.dto';
import { JoinCollaborationDto } from './dto/join-collaboration.dto';
import { UploadFileDto } from './dto/upload-file.dto';

@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);
  private projects: Map<string, MusicProject> = new Map();
  private projectsByCreator: Map<string, string[]> = new Map();
  private projectsByGenre: Map<MusicGenre, string[]> = new Map();

  constructor(
    private configService: ConfigService,
    private blockchainService: BlockchainService,
    private ccipService: CCIPService,
    private chainlinkService: ChainlinkService,
    private ipfsService: IPFSService,
    private webSocketService: WebSocketService,
  ) {}

  async createProject(createProjectDto: CreateProjectDto): Promise<MusicProject> {
    try {
      const projectId = uuidv4();
      const chainId = createProjectDto.chainId || 1; // Default to Ethereum

      // Create project on blockchain
      const blockchainResult = await this.blockchainService.createProject(chainId, {
        title: createProjectDto.title,
        genre: createProjectDto.genre,
        mood: createProjectDto.mood,
        tempo: createProjectDto.tempo,
        key: createProjectDto.key,
        totalBudget: createProjectDto.totalBudget,
        deadline: Math.floor(new Date(createProjectDto.deadline).getTime() / 1000),
      });

      // Create project record
      const project: MusicProject = {
        id: projectId,
        title: createProjectDto.title,
        genre: createProjectDto.genre,
        mood: createProjectDto.mood,
        tempo: createProjectDto.tempo,
        key: createProjectDto.key,
        creator: createProjectDto.creator,
        status: ProjectStatus.CREATED,
        totalBudget: createProjectDto.totalBudget,
        deadline: new Date(createProjectDto.deadline),
        collaborators: [],
        audioFiles: [],
        contributionRates: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store project
      this.projects.set(projectId, project);
      
      // Index by creator
      const creatorProjects = this.projectsByCreator.get(createProjectDto.creator) || [];
      creatorProjects.push(projectId);
      this.projectsByCreator.set(createProjectDto.creator, creatorProjects);

      // Index by genre
      const genreProjects = this.projectsByGenre.get(createProjectDto.genre) || [];
      genreProjects.push(projectId);
      this.projectsByGenre.set(createProjectDto.genre, genreProjects);

      // Create IPFS directory for project files
      await this.ipfsService.createProjectDirectory(projectId);

      // Notify via WebSocket
      this.webSocketService.sendProjectUpdate(projectId, {
        projectId,
        status: ProjectStatus.CREATED,
        progress: 0,
        message: 'Project created successfully',
      });

      this.logger.log(`Created music project: ${projectId} (${createProjectDto.title})`);
      return project;
    } catch (error) {
      this.logger.error('Failed to create project:', error);
      throw error;
    }
  }

  async getProject(projectId: string): Promise<MusicProject> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new NotFoundException(`Project not found: ${projectId}`);
    }
    return project;
  }

  async getProjectsByCreator(creator: string): Promise<MusicProject[]> {
    const projectIds = this.projectsByCreator.get(creator) || [];
    return projectIds.map(id => this.projects.get(id)).filter(Boolean) as MusicProject[];
  }

  async getProjectsByGenre(genre: MusicGenre): Promise<MusicProject[]> {
    const projectIds = this.projectsByGenre.get(genre) || [];
    return projectIds.map(id => this.projects.get(id)).filter(Boolean) as MusicProject[];
  }

  async joinCollaboration(
    projectId: string, 
    joinDto: JoinCollaborationDto
  ): Promise<MusicProject> {
    const project = await this.getProject(projectId);
    
    if (project.status !== ProjectStatus.CREATED && project.status !== ProjectStatus.COLLABORATION_OPEN) {
      throw new BadRequestException('Project is not accepting new collaborators');
    }

    try {
      // Get AI agent performance data from Chainlink
      const aiPerformance = await this.chainlinkService.getAIPerformanceData(joinDto.agentAddress);
      
      // Calculate dynamic pricing based on market data
      const trendData = await this.chainlinkService.getMusicTrendData(project.genre);
      const marketSentiment = 75; // Mock data - would come from Chainlink Functions
      
      const dynamicPrice = await this.chainlinkService.calculateDynamicPricing(
        joinDto.proposedRate,
        project.genre,
        aiPerformance?.performanceScore || 75,
        marketSentiment
      );

      // Join collaboration on blockchain
      const chainId = 1; // Should be stored with project
      await this.blockchainService.joinCollaboration(chainId, {
        projectId,
        agentAddress: joinDto.agentAddress,
        workType: joinDto.workType,
        proposedRate: dynamicPrice,
      });

      // Create AI Agent record if not exists
      const existingAgent = project.collaborators.find(
        agent => agent.address === joinDto.agentAddress
      );

      if (!existingAgent) {
        const newAgent = {
          id: uuidv4(),
          address: joinDto.agentAddress,
          name: `AI Agent ${joinDto.agentAddress.slice(0, 8)}...`,
          chainId: 1,
          specialization: [this.mapWorkTypeToSpecialization(joinDto.workType)],
          reputation: aiPerformance?.performanceScore || 75,
          pricePerHour: dynamicPrice,
          isAvailable: true,
          lastActiveAt: new Date(),
        };
        project.collaborators.push(newAgent);
      }

      // Update project status
      project.status = ProjectStatus.IN_PROGRESS;
      project.updatedAt = new Date();

      // Send cross-chain message if needed
      await this.ccipService.sendCollaborationRequest(
        1, // source chain
        1, // destination chain (could be different for multi-chain)
        projectId,
        joinDto.workType,
        dynamicPrice,
        Math.floor(project.deadline.getTime() / 1000),
        joinDto.message || 'Collaboration request',
        project.creator
      );

      // Notify via WebSocket
      this.webSocketService.sendCollaborationRequest(projectId, {
        projectId,
        requesterAddress: joinDto.agentAddress,
        workType: joinDto.workType,
        proposedRate: dynamicPrice,
        message: joinDto.message,
      });

      this.logger.log(`Agent ${joinDto.agentAddress} joined project ${projectId}`);
      return project;
    } catch (error) {
      this.logger.error('Failed to join collaboration:', error);
      throw error;
    }
  }

  async uploadAudioFile(
    projectId: string,
    file: Buffer,
    filename: string,
    uploadDto: UploadFileDto
  ): Promise<AudioFile> {
    const project = await this.getProject(projectId);

    try {
      // Upload to IPFS
      const audioFile = await this.ipfsService.uploadAudioFile(
        file,
        filename,
        projectId,
        uploadDto.contributorAddress
      );

      // Set version
      if (uploadDto.version) {
        audioFile.version = uploadDto.version;
      }

      // Add to project
      project.audioFiles.push(audioFile);
      project.updatedAt = new Date();

      // Update status if this is the first file
      if (project.status === ProjectStatus.CREATED) {
        project.status = ProjectStatus.IN_PROGRESS;
      }

      // Get quality score from Chainlink
      const qualityScore = await this.chainlinkService.getQualityScore(
        audioFile.ipfsHash,
        project.genre
      );

      // Update contribution rates
      this.updateContributionRates(project, uploadDto.contributorAddress, qualityScore);

      // Send file share notification
      await this.ccipService.sendFileShare(
        1, // source chain
        1, // destination chain
        projectId,
        audioFile.ipfsHash,
        {
          genre: project.genre,
          tempo: project.tempo,
          key: project.key,
          mood: project.mood,
        },
        project.creator
      );

      // Notify via WebSocket
      this.webSocketService.sendFileShared(projectId, {
        projectId,
        fileId: audioFile.id,
        filename: audioFile.filename,
        contributorAddress: uploadDto.contributorAddress,
        ipfsHash: audioFile.ipfsHash,
      });

      this.logger.log(`Uploaded audio file for project ${projectId}: ${filename}`);
      return audioFile;
    } catch (error) {
      this.logger.error('Failed to upload audio file:', error);
      throw error;
    }
  }

  async getAudioFile(projectId: string, fileId: string): Promise<Buffer> {
    const project = await this.getProject(projectId);
    const audioFile = project.audioFiles.find(f => f.id === fileId);
    
    if (!audioFile) {
      throw new NotFoundException(`Audio file not found: ${fileId}`);
    }

    return this.ipfsService.downloadAudioFile(audioFile.ipfsHash);
  }

  async updateProjectStatus(projectId: string, status: ProjectStatus): Promise<MusicProject> {
    const project = await this.getProject(projectId);
    
    project.status = status;
    project.updatedAt = new Date();

    // Calculate progress based on status
    const progress = this.calculateProjectProgress(project);

    // Notify via WebSocket
    this.webSocketService.sendProjectUpdate(projectId, {
      projectId,
      status,
      progress,
      message: `Project status updated to ${status}`,
    });

    // Send cross-chain update if project is completed
    if (status === ProjectStatus.COMPLETED) {
      await this.ccipService.sendCrossChainMessage(
        1, // source chain
        1, // destination chain
        CCIPMessageType.PROJECT_COMPLETION,
        { progressUpdate: { percentage: 100, currentStage: 'completed', estimatedCompletion: 0 } },
        project.creator,
        projectId
      );

      // Calculate and distribute payments
      await this.processProjectCompletion(project);
    }

    this.logger.log(`Updated project ${projectId} status to ${status}`);
    return project;
  }

  async getTrendingProjects(limit: number = 10): Promise<MusicProject[]> {
    const allProjects = Array.from(this.projects.values());
    
    // Sort by creation date and activity (mock implementation)
    return allProjects
      .sort((a, b) => {
        const scoreA = this.calculateTrendingScore(a);
        const scoreB = this.calculateTrendingScore(b);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  async searchProjects(query: {
    genre?: MusicGenre;
    mood?: string;
    status?: ProjectStatus;
    minTempo?: number;
    maxTempo?: number;
  }): Promise<MusicProject[]> {
    let projects = Array.from(this.projects.values());

    if (query.genre) {
      projects = projects.filter(p => p.genre === query.genre);
    }

    if (query.mood) {
      projects = projects.filter(p => 
        p.mood.toLowerCase().includes(query.mood.toLowerCase())
      );
    }

    if (query.status) {
      projects = projects.filter(p => p.status === query.status);
    }

    if (query.minTempo) {
      projects = projects.filter(p => p.tempo >= query.minTempo);
    }

    if (query.maxTempo) {
      projects = projects.filter(p => p.tempo <= query.maxTempo);
    }

    return projects;
  }

  private updateContributionRates(
    project: MusicProject,
    contributorAddress: string,
    qualityScore: number
  ): void {
    const existingRate = project.contributionRates.find(
      rate => rate.agentAddress === contributorAddress
    );

    if (existingRate) {
      existingRate.qualityScore = qualityScore;
      existingRate.timeContributed += 60; // Add 1 hour
    } else {
      project.contributionRates.push({
        agentAddress: contributorAddress,
        percentage: 0, // Will be calculated at project completion
        qualityScore,
        workType: WorkType.MELODY_CREATION, // Default
        timeContributed: 60,
      });
    }
  }

  private calculateProjectProgress(project: MusicProject): number {
    switch (project.status) {
      case ProjectStatus.CREATED: return 10;
      case ProjectStatus.COLLABORATION_OPEN: return 20;
      case ProjectStatus.IN_PROGRESS: return 50;
      case ProjectStatus.MIXING: return 80;
      case ProjectStatus.COMPLETED: return 100;
      case ProjectStatus.PUBLISHED: return 100;
      default: return 0;
    }
  }

  private calculateTrendingScore(project: MusicProject): number {
    const now = new Date().getTime();
    const createdTime = project.createdAt.getTime();
    const ageInDays = (now - createdTime) / (1000 * 60 * 60 * 24);
    
    let score = 0;
    score += project.collaborators.length * 10; // Collaboration activity
    score += project.audioFiles.length * 5; // File uploads
    score += Math.max(0, 7 - ageInDays) * 2; // Recency bonus
    
    return score;
  }

  private async processProjectCompletion(project: MusicProject): Promise<void> {
    // Calculate contribution percentages
    const totalQuality = project.contributionRates.reduce(
      (sum, rate) => sum + rate.qualityScore, 0
    );

    for (const rate of project.contributionRates) {
      rate.percentage = totalQuality > 0 ? (rate.qualityScore / totalQuality) * 100 : 0;
    }

    // Send payment instructions
    const totalBudget = parseFloat(project.totalBudget);
    for (const rate of project.contributionRates) {
      const payment = (totalBudget * rate.percentage) / 100;
      
      await this.ccipService.sendPaymentInstruction(
        1, // source chain
        1, // destination chain
        project.id,
        payment.toString(),
        'USDC',
        rate.agentAddress
      );

      // Notify via WebSocket
      this.webSocketService.sendPaymentUpdate(project.id, {
        projectId: project.id,
        recipientAddress: rate.agentAddress,
        amount: payment.toString(),
        token: 'USDC',
        txHash: '',
        status: 'pending',
      });
    }
  }

  private mapWorkTypeToSpecialization(workType: WorkType): any {
    switch (workType) {
      case WorkType.MELODY_CREATION:
        return 'composer';
      case WorkType.RHYTHM_SECTION:
        return 'producer';
      case WorkType.VOCAL_RECORDING:
        return 'vocalist';
      case WorkType.RAP_VERSE:
        return 'rapper';
      case WorkType.MIXING:
        return 'mixer';
      case WorkType.MASTERING:
        return 'mastering';
      default:
        return 'composer';
    }
  }
}