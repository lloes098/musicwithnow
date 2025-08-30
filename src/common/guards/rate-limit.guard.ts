import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomRateLimitGuard extends ThrottlerGuard {
  constructor(protected readonly reflector: Reflector) {
    super();
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Track by wallet address if available, otherwise by IP
    const walletAddress = req.body?.address || req.query?.address || req.headers?.['x-wallet-address'];
    
    if (walletAddress) {
      return `wallet:${walletAddress}`;
    }

    return req.ip;
  }

  protected async getThrottlerOptions(
    context: ExecutionContext,
  ): Promise<Array<{ limit: number; ttl: number; blockDuration?: number }>> {
    const options = await super.getThrottlerOptions(context);
    
    // Custom rate limits for different endpoints
    const request = context.switchToHttp().getRequest();
    const route = request.route?.path;

    if (route?.includes('/projects') && request.method === 'POST') {
      // Stricter limits for project creation
      return [{ limit: 10, ttl: 3600000 }]; // 10 per hour
    }

    if (route?.includes('/agents/register')) {
      // Stricter limits for agent registration
      return [{ limit: 5, ttl: 3600000 }]; // 5 per hour
    }

    if (route?.includes('/files') && request.method === 'POST') {
      // File upload limits
      return [{ limit: 50, ttl: 3600000 }]; // 50 per hour
    }

    return options;
  }
}