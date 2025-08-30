import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IPFSService } from './ipfs.service';

@Module({
  imports: [ConfigModule],
  providers: [IPFSService],
  exports: [IPFSService],
})
export class IPFSModule {}