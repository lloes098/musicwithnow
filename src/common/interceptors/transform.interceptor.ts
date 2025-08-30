import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  success: boolean;
  timestamp: string;
  path: string;
  statusCode: number;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    return next.handle().pipe(
      map((data) => ({
        data,
        success: true,
        timestamp: new Date().toISOString(),
        path: request.url,
        statusCode: response.statusCode,
      })),
    );
  }
}

@Injectable()
export class PaginationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Check if data is an array and needs pagination
        if (Array.isArray(data)) {
          const request = context.switchToHttp().getRequest();
          const page = parseInt(request.query.page || '1', 10);
          const limit = parseInt(request.query.limit || '20', 10);
          const offset = (page - 1) * limit;
          
          const paginatedData = data.slice(offset, offset + limit);
          const totalItems = data.length;
          const totalPages = Math.ceil(totalItems / limit);
          
          return {
            data: paginatedData,
            pagination: {
              page,
              limit,
              totalItems,
              totalPages,
              hasNext: page < totalPages,
              hasPrev: page > 1,
            },
          };
        }
        
        return data;
      }),
    );
  }
}

@Injectable()
export class BlockchainDataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Transform blockchain-specific data
        if (data && typeof data === 'object') {
          return this.transformBlockchainData(data);
        }
        
        return data;
      }),
    );
  }

  private transformBlockchainData(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.transformBlockchainData(item));
    }

    if (data && typeof data === 'object') {
      const transformed = { ...data };

      // Transform common blockchain data types
      Object.keys(transformed).forEach(key => {
        const value = transformed[key];

        // Transform BigNumber-like strings to readable format
        if (typeof value === 'string' && value.match(/^\d{18,}$/)) {
          try {
            // Assume 18 decimal token
            const formatted = (parseFloat(value) / Math.pow(10, 18)).toFixed(6);
            transformed[`${key}Formatted`] = `${formatted} ETH`;
          } catch (e) {
            // Keep original if transformation fails
          }
        }

        // Transform addresses to checksummed format
        if (key.toLowerCase().includes('address') && typeof value === 'string' && value.match(/^0x[0-9a-fA-F]{40}$/)) {
          try {
            const { ethers } = require('ethers');
            transformed[key] = ethers.getAddress(value);
          } catch (e) {
            // Keep original if transformation fails
          }
        }

        // Recursively transform nested objects
        if (value && typeof value === 'object') {
          transformed[key] = this.transformBlockchainData(value);
        }
      });

      return transformed;
    }

    return data;
  }
}