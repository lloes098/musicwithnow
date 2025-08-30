import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, ip, headers } = request;
    
    const walletAddress = request.walletAddress || headers['x-wallet-address'];
    const chainId = headers['x-chain-id'];
    
    const startTime = Date.now();
    
    this.logger.log(
      `${method} ${url} - IP: ${ip}${walletAddress ? ` - Wallet: ${walletAddress.slice(0, 8)}...` : ''}${chainId ? ` - Chain: ${chainId}` : ''}`
    );

    return next.handle().pipe(
      tap(
        (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          
          this.logger.log(
            `${method} ${url} - ${statusCode} - ${duration}ms${walletAddress ? ` - Wallet: ${walletAddress.slice(0, 8)}...` : ''}`
          );
        },
        (error) => {
          const duration = Date.now() - startTime;
          
          this.logger.error(
            `${method} ${url} - ERROR: ${error.message} - ${duration}ms${walletAddress ? ` - Wallet: ${walletAddress.slice(0, 8)}...` : ''}`
          );
        },
      ),
    );
  }
}

@Injectable()
export class TransactionLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TransactionLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    
    // Only log blockchain-related endpoints
    const blockchainEndpoints = [
      '/projects',
      '/agents',
      '/blockchain',
      '/ccip',
      '/chainlink'
    ];
    
    const isBlockchainEndpoint = blockchainEndpoints.some(endpoint => 
      url.includes(endpoint)
    );
    
    if (!isBlockchainEndpoint) {
      return next.handle();
    }

    const walletAddress = request.walletAddress;
    const chainId = request.headers['x-chain-id'];
    
    return next.handle().pipe(
      tap(
        (data) => {
          // Log successful blockchain transactions
          if (data && data.hash) {
            this.logger.log(
              `Blockchain Transaction - ${method} ${url} - TX: ${data.hash}${walletAddress ? ` - Wallet: ${walletAddress}` : ''}${chainId ? ` - Chain: ${chainId}` : ''}`
            );
          }
        },
        (error) => {
          this.logger.error(
            `Blockchain Transaction Failed - ${method} ${url} - Error: ${error.message}${walletAddress ? ` - Wallet: ${walletAddress}` : ''}${chainId ? ` - Chain: ${chainId}` : ''}`
          );
        },
      ),
    );
  }
}