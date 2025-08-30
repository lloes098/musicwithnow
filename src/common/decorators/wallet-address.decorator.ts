import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';
import { ethers } from 'ethers';

export const WalletAddress = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const address = request.body?.address || request.query?.address || request.headers?.['x-wallet-address'];
    
    if (!address) {
      throw new BadRequestException('Wallet address is required');
    }

    if (!ethers.isAddress(address)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    // Return checksummed address
    return ethers.getAddress(address);
  },
);

export const OptionalWalletAddress = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const address = request.body?.address || request.query?.address || request.headers?.['x-wallet-address'];
    
    if (!address) {
      return null;
    }

    if (!ethers.isAddress(address)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    return ethers.getAddress(address);
  },
);