import { WorkType } from './music.types';

export interface CCIPMessage {
  messageId: string;
  projectId: string;
  sourceChain: number;
  destinationChain: number;
  messageType: CCIPMessageType;
  sender: string;
  recipient: string;
  data: CCIPMessageData;
  gasLimit: number;
  timestamp: Date;
  status: MessageStatus;
  txHash?: string;
}

export interface CCIPMessageData {
  audioFileHash?: string;
  metadata?: {
    genre: string;
    tempo: number;
    key: string;
    mood: string;
  };
  collaborationRequest?: {
    workType: WorkType;
    budget: string;
    deadline: number;
    requirements: string;
  };
  progressUpdate?: {
    percentage: number;
    currentStage: string;
    estimatedCompletion: number;
  };
  paymentInfo?: {
    amount: string;
    token: string;
    recipient: string;
  };
}

export enum CCIPMessageType {
  COLLABORATION_REQUEST = 'collaboration_request',
  WORK_PROGRESS = 'work_progress',
  FILE_SHARE = 'file_share',
  PAYMENT_INSTRUCTION = 'payment_instruction',
  PROJECT_COMPLETION = 'project_completion',
  QUALITY_EVALUATION = 'quality_evaluation'
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  EXPIRED = 'expired'
}