import { IsString, IsArray, IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AISpecialization } from '../../../types/music.types';

export class RegisterAgentDto {
  @ApiProperty({ description: 'Agent name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: AISpecialization, isArray: true, description: 'Agent specializations' })
  @IsArray()
  @IsEnum(AISpecialization, { each: true })
  specialization: AISpecialization[];

  @ApiProperty({ description: 'Hourly rate in USDC' })
  @IsString()
  pricePerHour: string;

  @ApiProperty({ description: 'Agent wallet address' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'Target chain ID' })
  @IsNumber()
  chainId: number;

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