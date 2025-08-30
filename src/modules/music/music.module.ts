import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { CCIPModule } from '../ccip/ccip.module';
import { ChainlinkModule } from '../chainlink/chainlink.module';
import { IPFSModule } from '../ipfs/ipfs.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { MusicController } from './music.controller';
import { MusicService } from './music.service';

@Module({
  imports: [
    ConfigModule,
    MulterModule.register({
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
      },
    }),
    BlockchainModule,
    CCIPModule,
    ChainlinkModule,
    IPFSModule,
    WebSocketModule,
  ],
  controllers: [MusicController],
  providers: [MusicService],
  exports: [MusicService],
})
export class MusicModule {}