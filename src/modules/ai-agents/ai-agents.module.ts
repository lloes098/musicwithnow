import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { ChainlinkModule } from '../chainlink/chainlink.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { AIAgentsController } from './ai-agents.controller';
import { AIAgentsService } from './ai-agents.service';

@Module({
  imports: [
    ConfigModule,
    BlockchainModule,
    ChainlinkModule,
    WebSocketModule,
  ],
  controllers: [AIAgentsController],
  providers: [AIAgentsService],
  exports: [AIAgentsService],
})
export class AIAgentsModule {}