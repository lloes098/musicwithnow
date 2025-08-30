import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WebSocketService } from './websocket.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);

  constructor(private readonly webSocketService: WebSocketService) {}

  afterInit(server: Server) {
    this.webSocketService.setServer(server);
    this.webSocketService.startHeartbeat();
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      // Extract user info from connection handshake
      const userId = client.handshake.query.userId as string;
      const address = client.handshake.query.address as string;

      if (!userId || !address) {
        this.logger.warn('Client connected without proper authentication');
        client.disconnect();
        return;
      }

      this.webSocketService.handleClientConnection(client, userId, address);
    } catch (error) {
      this.logger.error('Error handling client connection:', error);
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.webSocketService.handleClientDisconnection(client.id);
  }

  @SubscribeMessage('join-project')
  handleJoinProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.webSocketService.updateClientActivity(client.id);
      
      if (!data.projectId) {
        client.emit('error', { message: 'Project ID is required' });
        return;
      }

      this.webSocketService.joinProjectRoom(client.id, data.projectId);
      
      client.emit('joined-project', { 
        projectId: data.projectId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error joining project:', error);
      client.emit('error', { message: 'Failed to join project room' });
    }
  }

  @SubscribeMessage('leave-project')
  handleLeaveProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.webSocketService.updateClientActivity(client.id);
      
      if (!data.projectId) {
        client.emit('error', { message: 'Project ID is required' });
        return;
      }

      this.webSocketService.leaveProjectRoom(client.id, data.projectId);
      
      client.emit('left-project', { 
        projectId: data.projectId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error leaving project:', error);
      client.emit('error', { message: 'Failed to leave project room' });
    }
  }

  @SubscribeMessage('chat-message')
  handleChatMessage(
    @MessageBody() data: { projectId: string; message: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.webSocketService.updateClientActivity(client.id);
      
      if (!data.projectId || !data.message || !data.userId) {
        client.emit('error', { message: 'Project ID, message, and user ID are required' });
        return;
      }

      const chatMessage = {
        userId: data.userId,
        message: data.message,
        timestamp: new Date(),
      };

      this.webSocketService.sendChatMessage(data.projectId, chatMessage);
    } catch (error) {
      this.logger.error('Error handling chat message:', error);
      client.emit('error', { message: 'Failed to send chat message' });
    }
  }

  @SubscribeMessage('request-collaboration')
  handleCollaborationRequest(
    @MessageBody() data: {
      projectId: string;
      requesterAddress: string;
      workType: string;
      proposedRate: string;
      message?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.webSocketService.updateClientActivity(client.id);
      
      if (!data.projectId || !data.requesterAddress || !data.workType || !data.proposedRate) {
        client.emit('error', { message: 'Missing required collaboration request fields' });
        return;
      }

      this.webSocketService.sendCollaborationRequest(data.projectId, {
        projectId: data.projectId,
        requesterAddress: data.requesterAddress,
        workType: data.workType,
        proposedRate: data.proposedRate,
        message: data.message,
      });

      client.emit('collaboration-request-sent', {
        projectId: data.projectId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error handling collaboration request:', error);
      client.emit('error', { message: 'Failed to send collaboration request' });
    }
  }

  @SubscribeMessage('update-progress')
  handleProgressUpdate(
    @MessageBody() data: {
      projectId: string;
      agentAddress: string;
      workType: string;
      progress: number;
      estimatedCompletion: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.webSocketService.updateClientActivity(client.id);
      
      if (!data.projectId || !data.agentAddress || !data.workType || data.progress === undefined) {
        client.emit('error', { message: 'Missing required progress update fields' });
        return;
      }

      this.webSocketService.sendAIProgress(data.projectId, {
        projectId: data.projectId,
        agentAddress: data.agentAddress,
        workType: data.workType,
        progress: data.progress,
        estimatedCompletion: data.estimatedCompletion || 0,
      });

      client.emit('progress-updated', {
        projectId: data.projectId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error handling progress update:', error);
      client.emit('error', { message: 'Failed to send progress update' });
    }
  }

  @SubscribeMessage('share-file')
  handleFileShare(
    @MessageBody() data: {
      projectId: string;
      fileId: string;
      filename: string;
      contributorAddress: string;
      ipfsHash: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.webSocketService.updateClientActivity(client.id);
      
      if (!data.projectId || !data.fileId || !data.filename || !data.contributorAddress || !data.ipfsHash) {
        client.emit('error', { message: 'Missing required file share fields' });
        return;
      }

      this.webSocketService.sendFileShared(data.projectId, {
        projectId: data.projectId,
        fileId: data.fileId,
        filename: data.filename,
        contributorAddress: data.contributorAddress,
        ipfsHash: data.ipfsHash,
      });

      client.emit('file-shared', {
        projectId: data.projectId,
        fileId: data.fileId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error handling file share:', error);
      client.emit('error', { message: 'Failed to share file' });
    }
  }

  @SubscribeMessage('get-project-users')
  handleGetProjectUsers(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.webSocketService.updateClientActivity(client.id);
      
      if (!data.projectId) {
        client.emit('error', { message: 'Project ID is required' });
        return;
      }

      const users = this.webSocketService.getProjectRoomUsers(data.projectId);
      const userList = users.map(user => ({
        userId: user.userId,
        address: user.address,
        lastActive: user.lastActive,
      }));

      client.emit('project-users', {
        projectId: data.projectId,
        users: userList,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error getting project users:', error);
      client.emit('error', { message: 'Failed to get project users' });
    }
  }

  @SubscribeMessage('get-connection-stats')
  handleGetConnectionStats(@ConnectedSocket() client: Socket) {
    try {
      this.webSocketService.updateClientActivity(client.id);
      
      const stats = this.webSocketService.getConnectionStats();
      
      client.emit('connection-stats', stats);
    } catch (error) {
      this.logger.error('Error getting connection stats:', error);
      client.emit('error', { message: 'Failed to get connection stats' });
    }
  }

  @SubscribeMessage('pong')
  handlePong(@ConnectedSocket() client: Socket) {
    this.webSocketService.updateClientActivity(client.id);
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket) {
    this.webSocketService.updateClientActivity(client.id);
    client.emit('heartbeat-ack', { timestamp: new Date() });
  }
}