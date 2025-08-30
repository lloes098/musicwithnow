import { IsString, IsEnum, IsNumber, IsDateString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MusicGenre } from '../../../types/music.types';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project title' })
  @IsString()
  title: string;

  @ApiProperty({ enum: MusicGenre, description: 'Music genre' })
  @IsEnum(MusicGenre)
  genre: MusicGenre;

  @ApiProperty({ description: 'Project mood/feeling' })
  @IsString()
  mood: string;

  @ApiProperty({ description: 'Tempo in BPM', minimum: 60, maximum: 200 })
  @IsNumber()
  @Min(60)
  @Max(200)
  tempo: number;

  @ApiProperty({ description: 'Musical key (e.g., C, D#, Gm)' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Total budget in USDC' })
  @IsString()
  totalBudget: string;

  @ApiProperty({ description: 'Project deadline' })
  @IsDateString()
  deadline: string;

  @ApiProperty({ description: 'Creator wallet address' })
  @IsString()
  creator: string;

  @ApiProperty({ description: 'Target chain ID', required: false })
  @IsOptional()
  @IsNumber()
  chainId?: number;
}