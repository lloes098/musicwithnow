import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadFileDto {
  @ApiProperty({ description: 'Contributor wallet address' })
  @IsString()
  contributorAddress: string;

  @ApiProperty({ description: 'File version number', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  version?: number;

  @ApiProperty({ description: 'Additional metadata as JSON string', required: false })
  @IsOptional()
  @IsString()
  metadata?: string;
}