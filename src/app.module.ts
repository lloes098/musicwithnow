import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { MusicModule } from './modules/music/music.module';
import { AIAgentsModule } from './modules/ai-agents/ai-agents.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { CCIPModule } from './modules/ccip/ccip.module';
import { ChainlinkModule } from './modules/chainlink/chainlink.module';
import { IPFSModule } from './modules/ipfs/ipfs.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('THROTTLE_TTL', 60000), // 1 minute
          limit: config.get('THROTTLE_LIMIT', 100), // 100 requests per minute
        },
      ],
    }),
    MusicModule,
    AIAgentsModule,
    BlockchainModule,
    CCIPModule,
    ChainlinkModule,
    IPFSModule,
    WebSocketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
