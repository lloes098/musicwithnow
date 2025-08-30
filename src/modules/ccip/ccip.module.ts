import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { CCIPService } from './ccip.service';

@Module({
  imports: [ConfigModule, BlockchainModule],
  providers: [CCIPService],
  exports: [CCIPService],
})
export class CCIPModule {}