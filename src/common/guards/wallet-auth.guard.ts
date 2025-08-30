import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ethers } from 'ethers';

@Injectable()
export class WalletAuthGuard implements CanActivate {
  private readonly logger = new Logger(WalletAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    try {
      const signature = request.headers['x-signature'];
      const message = request.headers['x-message'];
      const address = request.headers['x-wallet-address'];
      const timestamp = request.headers['x-timestamp'];

      if (!signature || !message || !address || !timestamp) {
        throw new UnauthorizedException('Missing authentication headers');
      }

      // Check if timestamp is recent (within 5 minutes)
      const now = Date.now();
      const requestTime = parseInt(timestamp, 10);
      if (now - requestTime > 300000) { // 5 minutes
        throw new UnauthorizedException('Request timestamp too old');
      }

      // Verify the signature
      const expectedMessage = `${message}:${timestamp}`;
      const recoveredAddress = ethers.verifyMessage(expectedMessage, signature);
      
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        throw new UnauthorizedException('Invalid signature');
      }

      // Add verified address to request
      request.walletAddress = ethers.getAddress(address);
      request.isAuthenticated = true;

      return true;
    } catch (error) {
      this.logger.error('Wallet authentication failed:', error.message);
      throw new UnauthorizedException('Invalid wallet authentication');
    }
  }
}

@Injectable()
export class OptionalWalletAuthGuard implements CanActivate {
  private readonly logger = new Logger(OptionalWalletAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    try {
      const signature = request.headers['x-signature'];
      const message = request.headers['x-message'];
      const address = request.headers['x-wallet-address'];
      const timestamp = request.headers['x-timestamp'];

      // If no auth headers, continue without authentication
      if (!signature && !message && !address && !timestamp) {
        request.isAuthenticated = false;
        return true;
      }

      // If some headers are present, validate all
      if (!signature || !message || !address || !timestamp) {
        request.isAuthenticated = false;
        return true;
      }

      // Check timestamp
      const now = Date.now();
      const requestTime = parseInt(timestamp, 10);
      if (now - requestTime > 300000) {
        request.isAuthenticated = false;
        return true;
      }

      // Verify signature
      const expectedMessage = `${message}:${timestamp}`;
      const recoveredAddress = ethers.verifyMessage(expectedMessage, signature);
      
      if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
        request.walletAddress = ethers.getAddress(address);
        request.isAuthenticated = true;
      } else {
        request.isAuthenticated = false;
      }

      return true;
    } catch (error) {
      this.logger.debug('Optional wallet authentication failed:', error.message);
      request.isAuthenticated = false;
      return true;
    }
  }
}