import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';
import { isChainSupported } from '../../config/chains.config';

export const ChainId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const chainId = request.body?.chainId || request.query?.chainId || request.headers?.['x-chain-id'];
    
    if (!chainId) {
      throw new BadRequestException('Chain ID is required');
    }

    const chainIdNum = typeof chainId === 'string' ? parseInt(chainId, 10) : chainId;
    
    if (isNaN(chainIdNum)) {
      throw new BadRequestException('Chain ID must be a valid number');
    }

    if (!isChainSupported(chainIdNum)) {
      throw new BadRequestException(`Chain ID ${chainIdNum} is not supported`);
    }

    return chainIdNum;
  },
);

export const OptionalChainId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const chainId = request.body?.chainId || request.query?.chainId || request.headers?.['x-chain-id'];
    
    if (!chainId) {
      return 1; // Default to Ethereum
    }

    const chainIdNum = typeof chainId === 'string' ? parseInt(chainId, 10) : chainId;
    
    if (isNaN(chainIdNum)) {
      throw new BadRequestException('Chain ID must be a valid number');
    }

    if (!isChainSupported(chainIdNum)) {
      throw new BadRequestException(`Chain ID ${chainIdNum} is not supported`);
    }

    return chainIdNum;
  },
);