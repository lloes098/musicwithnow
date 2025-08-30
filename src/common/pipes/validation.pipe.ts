import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ethers } from 'ethers';

@Injectable()
export class WalletAddressValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) {
      throw new BadRequestException('Wallet address is required');
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('Wallet address must be a string');
    }

    if (!ethers.isAddress(value)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    // Return checksummed address
    return ethers.getAddress(value);
  }
}

@Injectable()
export class ChainIdValidationPipe implements PipeTransform {
  private readonly supportedChains = [1, 8453, 42161, 60808]; // Ethereum, Base, Arbitrum, Monad

  transform(value: any, metadata: ArgumentMetadata) {
    if (value === undefined || value === null) {
      return 1; // Default to Ethereum
    }

    const chainId = typeof value === 'string' ? parseInt(value, 10) : value;

    if (isNaN(chainId)) {
      throw new BadRequestException('Chain ID must be a valid number');
    }

    if (!this.supportedChains.includes(chainId)) {
      throw new BadRequestException(
        `Chain ID ${chainId} is not supported. Supported chains: ${this.supportedChains.join(', ')}`
      );
    }

    return chainId;
  }
}

@Injectable()
export class IPFSHashValidationPipe implements PipeTransform {
  private readonly ipfsHashRegex = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58}|B[A-Z2-7]{58}|z[1-9A-HJ-NP-Za-km-z]{48}|F[0-9A-F]{50})$/;

  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) {
      throw new BadRequestException('IPFS hash is required');
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('IPFS hash must be a string');
    }

    if (!this.ipfsHashRegex.test(value)) {
      throw new BadRequestException('Invalid IPFS hash format');
    }

    return value;
  }
}

@Injectable()
export class PositiveNumberPipe implements PipeTransform {
  constructor(private readonly allowZero: boolean = false) {}

  transform(value: any, metadata: ArgumentMetadata) {
    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num)) {
      throw new BadRequestException('Value must be a valid number');
    }

    if (this.allowZero && num < 0) {
      throw new BadRequestException('Value must be zero or positive');
    }

    if (!this.allowZero && num <= 0) {
      throw new BadRequestException('Value must be positive');
    }

    return num;
  }
}

@Injectable()
export class EthereumAmountPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) {
      throw new BadRequestException('Amount is required');
    }

    const amount = typeof value === 'string' ? value : value.toString();

    try {
      // Validate that it's a valid ethereum amount (can be parsed by ethers)
      const parsed = ethers.parseEther(amount);
      
      if (parsed < 0n) {
        throw new BadRequestException('Amount cannot be negative');
      }

      // Return the original string format for consistency
      return amount;
    } catch (error) {
      throw new BadRequestException('Invalid Ethereum amount format');
    }
  }
}

@Injectable()
export class ProjectIdValidationPipe implements PipeTransform {
  private readonly uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) {
      throw new BadRequestException('Project ID is required');
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('Project ID must be a string');
    }

    if (!this.uuidRegex.test(value)) {
      throw new BadRequestException('Invalid project ID format (must be UUID)');
    }

    return value;
  }
}