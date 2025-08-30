import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { ChainlinkService } from './chainlink.service';

@Module({
  imports: [ConfigModule, BlockchainModule],
  providers: [ChainlinkService],
  exports: [ChainlinkService],
})
export class ChainlinkModule {}