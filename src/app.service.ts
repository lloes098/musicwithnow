import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHello(): string {
    return 'AI Music Collaboration Platform API is running! 🎵';
  }

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'AI Music Platform Backend',
      version: this.getVersion().version,
      environment: this.configService.get('NODE_ENV', 'development'),
      components: {
        blockchain: 'operational',
        ccip: 'operational',
        chainlink: 'operational',
        ipfs: 'operational',
        websocket: 'operational',
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  getVersion() {
    return {
      version: '1.0.0',
      name: 'AI Music Collaboration Platform',
      description: 'Cross-chain AI music collaboration platform using Chainlink CCIP and Monad',
      features: [
        'Multi-chain music project management',
        'AI agent collaboration system',
        'Cross-chain messaging with CCIP',
        'Chainlink data feeds and functions',
        'IPFS audio file storage',
        'Real-time WebSocket collaboration',
      ],
      chains: ['Ethereum', 'Monad', 'Base', 'Arbitrum'],
      buildTime: new Date().toISOString(),
    };
  }
}