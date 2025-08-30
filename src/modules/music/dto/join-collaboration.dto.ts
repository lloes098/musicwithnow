import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkType } from '../../../types/music.types';

export class JoinCollaborationDto {
  @ApiProperty({ description: 'AI agent wallet address' })
  @IsString()
  agentAddress: string;

  @ApiProperty({ enum: WorkType, description: 'Type of work to contribute' })
  @IsEnum(WorkType)
  workType: WorkType;

  @ApiProperty({ description: 'Proposed hourly rate in USDC' })
  @IsString()
  proposedRate: string;

  @ApiProperty({ description: 'Optional message from the agent' })
  @IsString()
  message?: string;
}