import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { MusicService } from './music.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JoinCollaborationDto } from './dto/join-collaboration.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { MusicProject, MusicGenre, ProjectStatus } from '../../types/music.types';

@ApiTags('Music Projects')
@Controller('api/v1/projects')
export class MusicController {
  private readonly logger = new Logger(MusicController.name);

  constructor(private readonly musicService: MusicService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new music project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createProject(@Body() createProjectDto: CreateProjectDto): Promise<MusicProject> {
    this.logger.log(`Creating project: ${createProjectDto.title}`);
    return this.musicService.createProject(createProjectDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({ status: 200, description: 'Project found' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProject(@Param('id') id: string): Promise<MusicProject> {
    return this.musicService.getProject(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update project status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateProjectStatus(
    @Param('id') id: string,
    @Body('status') status: ProjectStatus,
  ): Promise<MusicProject> {
    this.logger.log(`Updating project ${id} status to ${status}`);
    return this.musicService.updateProjectStatus(id, status);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a project as an AI agent' })
  @ApiResponse({ status: 200, description: 'Successfully joined collaboration' })
  @ApiResponse({ status: 400, description: 'Cannot join collaboration' })
  async joinCollaboration(
    @Param('id') projectId: string,
    @Body() joinCollaborationDto: JoinCollaborationDto,
  ): Promise<MusicProject> {
    this.logger.log(`Agent ${joinCollaborationDto.agentAddress} joining project ${projectId}`);
    return this.musicService.joinCollaboration(projectId, joinCollaborationDto);
  }

  @Get(':id/collaborators')
  @ApiOperation({ summary: 'Get project collaborators' })
  @ApiResponse({ status: 200, description: 'Collaborators retrieved' })
  async getCollaborators(@Param('id') id: string) {
    const project = await this.musicService.getProject(id);
    return {
      projectId: id,
      collaborators: project.collaborators,
      contributionRates: project.contributionRates,
    };
  }

  @Post(':id/files')
  @ApiOperation({ summary: 'Upload an audio file to a project' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('id') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type (basic validation)
    const allowedTypes = [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
      'audio/aac',
      'audio/flac',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only audio files are allowed.');
    }

    this.logger.log(`Uploading file ${file.originalname} to project ${projectId}`);
    
    return this.musicService.uploadAudioFile(
      projectId,
      file.buffer,
      file.originalname,
      uploadFileDto,
    );
  }

  @Get(':id/files')
  @ApiOperation({ summary: 'Get all files in a project' })
  @ApiResponse({ status: 200, description: 'Files retrieved' })
  async getProjectFiles(@Param('id') id: string) {
    const project = await this.musicService.getProject(id);
    return {
      projectId: id,
      files: project.audioFiles,
    };
  }

  @Get(':projectId/files/:fileId')
  @ApiOperation({ summary: 'Download an audio file' })
  @ApiResponse({ status: 200, description: 'File downloaded' })
  async downloadFile(
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
  ) {
    const fileBuffer = await this.musicService.getAudioFile(projectId, fileId);
    return {
      projectId,
      fileId,
      data: fileBuffer.toString('base64'),
      encoding: 'base64',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Search and filter projects' })
  @ApiResponse({ status: 200, description: 'Projects retrieved' })
  async searchProjects(
    @Query('creator') creator?: string,
    @Query('genre') genre?: MusicGenre,
    @Query('mood') mood?: string,
    @Query('status') status?: ProjectStatus,
    @Query('minTempo') minTempo?: number,
    @Query('maxTempo') maxTempo?: number,
    @Query('trending') trending?: boolean,
    @Query('limit') limit?: number,
  ): Promise<MusicProject[]> {
    if (creator) {
      return this.musicService.getProjectsByCreator(creator);
    }

    if (trending) {
      return this.musicService.getTrendingProjects(limit || 10);
    }

    if (genre && !mood && !status && !minTempo && !maxTempo) {
      return this.musicService.getProjectsByGenre(genre);
    }

    return this.musicService.searchProjects({
      genre,
      mood,
      status,
      minTempo,
      maxTempo,
    });
  }

  @Get('trending/top')
  @ApiOperation({ summary: 'Get trending projects' })
  @ApiResponse({ status: 200, description: 'Trending projects retrieved' })
  async getTrendingProjects(@Query('limit') limit?: number): Promise<MusicProject[]> {
    return this.musicService.getTrendingProjects(limit || 10);
  }

  @Get('genres/:genre')
  @ApiOperation({ summary: 'Get projects by genre' })
  @ApiResponse({ status: 200, description: 'Projects retrieved by genre' })
  async getProjectsByGenre(@Param('genre') genre: MusicGenre): Promise<MusicProject[]> {
    return this.musicService.getProjectsByGenre(genre);
  }

  @Get('creator/:address')
  @ApiOperation({ summary: 'Get projects by creator address' })
  @ApiResponse({ status: 200, description: 'Projects retrieved by creator' })
  async getProjectsByCreator(@Param('address') address: string): Promise<MusicProject[]> {
    return this.musicService.getProjectsByCreator(address);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get project analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
  async getProjectAnalytics(@Param('id') id: string) {
    const project = await this.musicService.getProject(id);
    
    // Calculate analytics
    const totalContributors = project.collaborators.length;
    const totalFiles = project.audioFiles.length;
    const avgQuality = project.contributionRates.length > 0
      ? project.contributionRates.reduce((sum, rate) => sum + rate.qualityScore, 0) / project.contributionRates.length
      : 0;
    
    const timeToCompletion = project.status === ProjectStatus.COMPLETED
      ? project.updatedAt.getTime() - project.createdAt.getTime()
      : null;

    return {
      projectId: id,
      totalContributors,
      totalFiles,
      averageQuality: Math.round(avgQuality * 100) / 100,
      status: project.status,
      budget: project.totalBudget,
      timeToCompletion,
      createdAt: project.createdAt,
      lastUpdated: project.updatedAt,
      contributionBreakdown: project.contributionRates.map(rate => ({
        agent: rate.agentAddress,
        contribution: rate.percentage,
        quality: rate.qualityScore,
        workType: rate.workType,
        timeSpent: rate.timeContributed,
      })),
    };
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share project cross-chain' })
  @ApiResponse({ status: 200, description: 'Project shared successfully' })
  async shareProjectCrossChain(
    @Param('id') projectId: string,
    @Body() body: { destinationChain: number; recipient: string },
  ) {
    // This would integrate with the CCIP service
    // Implementation depends on specific cross-chain sharing requirements
    this.logger.log(`Sharing project ${projectId} to chain ${body.destinationChain}`);
    
    return {
      projectId,
      destinationChain: body.destinationChain,
      recipient: body.recipient,
      status: 'shared',
      timestamp: new Date(),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project (creator only)' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  async deleteProject(@Param('id') id: string, @Query('creator') creator: string) {
    const project = await this.musicService.getProject(id);
    
    if (project.creator !== creator) {
      throw new BadRequestException('Only the project creator can delete the project');
    }

    // In a real implementation, you would:
    // 1. Check if project can be deleted (no active collaborations, etc.)
    // 2. Clean up blockchain state
    // 3. Remove IPFS files
    // 4. Notify collaborators
    
    this.logger.log(`Deleting project ${id} by creator ${creator}`);
    
    return {
      projectId: id,
      status: 'deleted',
      timestamp: new Date(),
    };
  }
}