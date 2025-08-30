import { IsString, IsArray, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AISpecialization } from '../../../types/music.types';

export class UpdateAgentDto {
  @ApiProperty({ description: 'Agent name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: AISpecialization, isArray: true, description: 'Agent specializations', required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(AISpecialization, { each: true })
  specialization?: AISpecialization[];

  @ApiProperty({ description: 'Hourly rate in USDC', required: false })
  @IsOptional()
  @IsString()
  pricePerHour?: string;

  @ApiProperty({ description: 'Agent availability status', required: false })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({ description: 'Agent description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Agent portfolio/demo links', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  portfolioLinks?: string[];
}