import * as crypto from 'crypto';
import { ethers } from 'ethers';

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Hash data using SHA256
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash data using Keccak256 (Ethereum compatible)
 */
export function keccak256(data: string | Uint8Array): string {
  return ethers.keccak256(typeof data === 'string' ? ethers.toUtf8Bytes(data) : data);
}

/**
 * Create HMAC signature
 */
export function createHMAC(data: string, key: string, algorithm: string = 'sha256'): string {
  return crypto.createHmac(algorithm, key).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHMAC(data: string, signature: string, key: string, algorithm: string = 'sha256'): boolean {
  const expectedSignature = createHMAC(data, key, algorithm);
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(plaintext: string, key: string): { encrypted: string; iv: string; tag: string } {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const keyBuffer = crypto.createHash('sha256').update(key).digest();
  
  const cipher = crypto.createCipherGCM(algorithm, keyBuffer, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag().toString('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(encryptedData: { encrypted: string; iv: string; tag: string }, key: string): string {
  const algorithm = 'aes-256-gcm';
  const keyBuffer = crypto.createHash('sha256').update(key).digest();
  
  const decipher = crypto.createDecipherGCM(algorithm, keyBuffer, Buffer.from(encryptedData.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a secure API key
 */
export function generateAPIKey(prefix: string = 'amp'): string {
  const timestamp = Date.now().toString(36);
  const randomPart = generateSecureRandomString(16);
  return `${prefix}_${timestamp}_${randomPart}`;
}

/**
 * Create a deterministic hash from multiple inputs
 */
export function createDeterministicHash(...inputs: string[]): string {
  const combined = inputs.sort().join('|');
  return sha256(combined);
}

/**
 * Generate a proof of work challenge
 */
export function generateProofOfWork(data: string, difficulty: number = 4): { nonce: number; hash: string } {
  let nonce = 0;
  const target = '0'.repeat(difficulty);
  
  while (true) {
    const hash = sha256(`${data}${nonce}`);
    if (hash.startsWith(target)) {
      return { nonce, hash };
    }
    nonce++;
  }
}

/**
 * Verify proof of work
 */
export function verifyProofOfWork(data: string, nonce: number, difficulty: number = 4): boolean {
  const hash = sha256(`${data}${nonce}`);
  const target = '0'.repeat(difficulty);
  return hash.startsWith(target);
}

/**
 * Create a time-locked hash
 */
export function createTimeLockedHash(data: string, expirationTime: number): string {
  const payload = {
    data,
    expiration: expirationTime,
    timestamp: Date.now(),
  };
  
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Verify and extract time-locked hash
 */
export function verifyTimeLockedHash(hash: string): { data: string; isValid: boolean; isExpired: boolean } {
  try {
    const payload = JSON.parse(Buffer.from(hash, 'base64').toString());
    const now = Date.now();
    
    return {
      data: payload.data,
      isValid: payload.timestamp && payload.expiration && payload.data,
      isExpired: now > payload.expiration,
    };
  } catch {
    return {
      data: '',
      isValid: false,
      isExpired: true,
    };
  }
}

/**
 * Generate a secure session token
 */
export function generateSessionToken(userId: string, expirationHours: number = 24): string {
  const expiration = Date.now() + (expirationHours * 60 * 60 * 1000);
  const sessionData = {
    userId,
    expiration,
    random: generateSecureRandomString(8),
  };
  
  return Buffer.from(JSON.stringify(sessionData)).toString('base64');
}

/**
 * Verify session token
 */
export function verifySessionToken(token: string): { userId: string; isValid: boolean; isExpired: boolean } {
  try {
    const sessionData = JSON.parse(Buffer.from(token, 'base64').toString());
    const now = Date.now();
    
    return {
      userId: sessionData.userId,
      isValid: sessionData.userId && sessionData.expiration,
      isExpired: now > sessionData.expiration,
    };
  } catch {
    return {
      userId: '',
      isValid: false,
      isExpired: true,
    };
  }
}