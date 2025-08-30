import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { AudioFile } from '../../types/music.types';
import * as crypto from 'crypto';

export interface IPFSUploadResult {
  hash: string;
  path: string;
  size: number;
}

export interface AudioMetadata {
  filename: string;
  duration: number;
  sampleRate: number;
  bitrate: number;
  format: string;
  waveformData?: number[];
}

@Injectable()
export class IPFSService implements OnModuleInit {
  private readonly logger = new Logger(IPFSService.name);
  private client: IPFSHTTPClient;
  private uploadCache: Map<string, IPFSUploadResult> = new Map();
  private metadataCache: Map<string, AudioMetadata> = new Map();

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeIPFSClient();
  }

  private async initializeIPFSClient() {
    try {
      const ipfsUrl = this.configService.get<string>('IPFS_URL', 'http://127.0.0.1:5001');
      const ipfsProjectId = this.configService.get<string>('IPFS_PROJECT_ID');
      const ipfsProjectSecret = this.configService.get<string>('IPFS_PROJECT_SECRET');

      const options: any = {
        url: ipfsUrl,
        timeout: 60000,
      };

      // If using Infura IPFS
      if (ipfsProjectId && ipfsProjectSecret) {
        const auth = 'Basic ' + Buffer.from(ipfsProjectId + ':' + ipfsProjectSecret).toString('base64');
        options.headers = {
          authorization: auth,
        };
      }

      this.client = create(options);
      
      // Test connection
      const version = await this.client.version();
      this.logger.log(`Connected to IPFS node version: ${version.version}`);
    } catch (error) {
      this.logger.error('Failed to initialize IPFS client:', error);
      throw error;
    }
  }

  async uploadAudioFile(
    file: Buffer, 
    filename: string, 
    projectId: string,
    contributorAddress: string
  ): Promise<AudioFile> {
    try {
      // Generate file hash for deduplication
      const fileHash = crypto.createHash('sha256').update(file).digest('hex');
      
      // Check if file already exists in cache
      const cachedResult = this.uploadCache.get(fileHash);
      if (cachedResult) {
        this.logger.log(`File already exists in IPFS: ${cachedResult.hash}`);
        return this.createAudioFileRecord(
          cachedResult,
          filename,
          projectId,
          contributorAddress,
          await this.extractAudioMetadata(file, filename)
        );
      }

      // Upload to IPFS
      const result = await this.client.add(file, {
        pin: true,
        wrapWithDirectory: false,
      });

      const uploadResult: IPFSUploadResult = {
        hash: result.cid.toString(),
        path: result.path,
        size: result.size,
      };

      // Cache the result
      this.uploadCache.set(fileHash, uploadResult);
      
      // Extract audio metadata
      const metadata = await this.extractAudioMetadata(file, filename);
      this.metadataCache.set(uploadResult.hash, metadata);

      this.logger.log(`Successfully uploaded audio file to IPFS: ${uploadResult.hash}`);
      
      return this.createAudioFileRecord(uploadResult, filename, projectId, contributorAddress, metadata);
    } catch (error) {
      this.logger.error('Failed to upload audio file to IPFS:', error);
      throw error;
    }
  }

  async downloadAudioFile(ipfsHash: string): Promise<Buffer> {
    try {
      const chunks: Uint8Array[] = [];
      
      for await (const chunk of this.client.cat(ipfsHash)) {
        chunks.push(chunk);
      }
      
      const fileBuffer = Buffer.concat(chunks);
      this.logger.log(`Successfully downloaded audio file from IPFS: ${ipfsHash}`);
      
      return fileBuffer;
    } catch (error) {
      this.logger.error(`Failed to download audio file from IPFS ${ipfsHash}:`, error);
      throw error;
    }
  }

  async uploadMetadata(metadata: any): Promise<string> {
    try {
      const metadataString = JSON.stringify(metadata, null, 2);
      const result = await this.client.add(metadataString, {
        pin: true,
      });

      this.logger.log(`Successfully uploaded metadata to IPFS: ${result.cid.toString()}`);
      return result.cid.toString();
    } catch (error) {
      this.logger.error('Failed to upload metadata to IPFS:', error);
      throw error;
    }
  }

  async downloadMetadata(ipfsHash: string): Promise<any> {
    try {
      const chunks: Uint8Array[] = [];
      
      for await (const chunk of this.client.cat(ipfsHash)) {
        chunks.push(chunk);
      }
      
      const metadataString = Buffer.concat(chunks).toString('utf-8');
      const metadata = JSON.parse(metadataString);
      
      this.logger.log(`Successfully downloaded metadata from IPFS: ${ipfsHash}`);
      return metadata;
    } catch (error) {
      this.logger.error(`Failed to download metadata from IPFS ${ipfsHash}:`, error);
      throw error;
    }
  }

  async pinFile(ipfsHash: string): Promise<void> {
    try {
      await this.client.pin.add(ipfsHash);
      this.logger.log(`Successfully pinned file: ${ipfsHash}`);
    } catch (error) {
      this.logger.error(`Failed to pin file ${ipfsHash}:`, error);
      throw error;
    }
  }

  async unpinFile(ipfsHash: string): Promise<void> {
    try {
      await this.client.pin.rm(ipfsHash);
      this.logger.log(`Successfully unpinned file: ${ipfsHash}`);
    } catch (error) {
      this.logger.error(`Failed to unpin file ${ipfsHash}:`, error);
      throw error;
    }
  }

  async getFileStats(ipfsHash: string): Promise<any> {
    try {
      const stats = await this.client.object.stat(ipfsHash);
      return {
        hash: ipfsHash,
        size: stats.CumulativeSize,
        links: stats.NumLinks,
        blockSize: stats.BlockSize,
        dataSize: stats.DataSize,
      };
    } catch (error) {
      this.logger.error(`Failed to get file stats for ${ipfsHash}:`, error);
      throw error;
    }
  }

  async createProjectDirectory(projectId: string): Promise<string> {
    try {
      const projectMetadata = {
        projectId,
        createdAt: new Date().toISOString(),
        type: 'project_directory',
      };

      const result = await this.uploadMetadata(projectMetadata);
      this.logger.log(`Created project directory for ${projectId}: ${result}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to create project directory for ${projectId}:`, error);
      throw error;
    }
  }

  async uploadWaveformData(waveformData: number[]): Promise<string> {
    try {
      const waveformJson = JSON.stringify({ waveform: waveformData });
      const result = await this.client.add(waveformJson, {
        pin: true,
      });

      this.logger.log(`Successfully uploaded waveform data: ${result.cid.toString()}`);
      return result.cid.toString();
    } catch (error) {
      this.logger.error('Failed to upload waveform data:', error);
      throw error;
    }
  }

  async downloadWaveformData(ipfsHash: string): Promise<number[]> {
    try {
      const chunks: Uint8Array[] = [];
      
      for await (const chunk of this.client.cat(ipfsHash)) {
        chunks.push(chunk);
      }
      
      const waveformString = Buffer.concat(chunks).toString('utf-8');
      const waveformData = JSON.parse(waveformString);
      
      return waveformData.waveform || [];
    } catch (error) {
      this.logger.error(`Failed to download waveform data from ${ipfsHash}:`, error);
      throw error;
    }
  }

  private async extractAudioMetadata(file: Buffer, filename: string): Promise<AudioMetadata> {
    // This is a simplified metadata extraction
    // In production, you would use libraries like node-ffmpeg or music-metadata
    const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
    
    return {
      filename,
      duration: 0, // Would be extracted from actual audio file
      sampleRate: 44100, // Default
      bitrate: 320, // Default
      format: fileExtension,
      waveformData: await this.generateMockWaveform(file),
    };
  }

  private async generateMockWaveform(file: Buffer): Promise<number[]> {
    // Mock waveform generation - in production, use proper audio analysis
    const waveformLength = 200;
    const waveform: number[] = [];
    
    for (let i = 0; i < waveformLength; i++) {
      // Generate mock waveform based on file content
      const sample = (file[i % file.length] || 0) / 255;
      waveform.push(sample);
    }
    
    return waveform;
  }

  private createAudioFileRecord(
    uploadResult: IPFSUploadResult,
    filename: string,
    projectId: string,
    contributorAddress: string,
    metadata: AudioMetadata
  ): AudioFile {
    return {
      id: crypto.randomUUID(),
      projectId,
      ipfsHash: uploadResult.hash,
      filename,
      fileSize: uploadResult.size,
      duration: metadata.duration,
      waveformData: metadata.waveformData || [],
      contributorAddress,
      version: 1,
      createdAt: new Date(),
    };
  }

  getUploadCache(): Map<string, IPFSUploadResult> {
    return this.uploadCache;
  }

  getMetadataCache(): Map<string, AudioMetadata> {
    return this.metadataCache;
  }

  async getNodeInfo(): Promise<any> {
    try {
      const [version, id, peers] = await Promise.all([
        this.client.version(),
        this.client.id(),
        this.client.swarm.peers(),
      ]);

      return {
        version: version.version,
        nodeId: id.id,
        peerCount: peers.length,
        addresses: id.addresses,
      };
    } catch (error) {
      this.logger.error('Failed to get IPFS node info:', error);
      throw error;
    }
  }
}