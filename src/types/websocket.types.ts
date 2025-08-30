export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
  timestamp: Date;
  userId?: string;
  projectId?: string;
}

export enum WebSocketMessageType {
  PROJECT_UPDATE = 'project-update',
  AI_PROGRESS = 'ai-progress',
  FILE_SHARED = 'file-shared',
  COLLABORATION_REQUEST = 'collaboration-request',
  PAYMENT_UPDATE = 'payment-update',
  CHAT_MESSAGE = 'chat-message',
  USER_JOINED = 'user-joined',
  USER_LEFT = 'user-left'
}

export interface ProjectUpdateEvent {
  projectId: string;
  status: string;
  progress: number;
  message: string;
}

export interface AIProgressEvent {
  projectId: string;
  agentAddress: string;
  workType: string;
  progress: number;
  estimatedCompletion: number;
}

export interface FileSharedEvent {
  projectId: string;
  fileId: string;
  filename: string;
  contributorAddress: string;
  ipfsHash: string;
}

export interface CollaborationRequestEvent {
  projectId: string;
  requesterAddress: string;
  workType: string;
  proposedRate: string;
  message?: string;
}

export interface PaymentUpdateEvent {
  projectId: string;
  recipientAddress: string;
  amount: string;
  token: string;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
}