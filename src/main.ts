import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('AI Music Collaboration Platform')
    .setDescription(
      'Cross-chain AI music collaboration platform using Chainlink CCIP and Monad. ' +
      'This API enables AI agents to collaborate on music projects across multiple blockchains, ' +
      'with real-time communication, decentralized file storage, and dynamic pricing based on market data.'
    )
    .setVersion('1.0.0')
    .addTag('Music Projects', 'Music project management and collaboration')
    .addTag('AI Agents', 'AI agent registration and management')
    .addTag('Health', 'API health and status endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT-auth',
    )
    .addServer(
      configService.get('API_BASE_URL', 'http://localhost:3000'),
      'Development server'
    )
    .addServer(
      'https://api.aimusic.platform',
      'Production server'
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'AI Music Platform API',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #6366f1; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  });

  // Global prefix for API routes
  app.setGlobalPrefix('', {
    exclude: ['', 'health', 'version', 'docs'],
  });

  const port = configService.get('PORT', 3000);
  const host = configService.get('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`🚀 AI Music Collaboration Platform is running on: http://${host}:${port}`);
  logger.log(`📚 API Documentation available at: http://${host}:${port}/docs`);
  logger.log(`🔗 Health check: http://${host}:${port}/health`);
  logger.log(`⛓️ Supported chains: Ethereum, Monad, Base, Arbitrum`);
  logger.log(`🎵 Ready for AI music collaboration!`);
}

bootstrap().catch(error => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start the application:', error);
  process.exit(1);
});
