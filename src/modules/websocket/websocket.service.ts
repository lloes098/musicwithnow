import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { 
  WebSocketMessage, 
  WebSocketMessageType,
  ProjectUpdateEvent,
  AIProgressEvent,
  FileSharedEvent,
  CollaborationRequestEvent,
  PaymentUpdateEvent
} from '../../types/websocket.types';

interface ConnectedClient {
  socket: Socket;
  userId: string;
  address: string;
  joinedProjects: Set<string>;
  lastActive: Date;
}

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private server: Server;
  private connectedClients: Map<string, ConnectedClient> = new Map();
  private projectRooms: Map<string, Set<string>> = new Map();

  setServer(server: Server) {
    this.server = server;
  }

  handleClientConnection(socket: Socket, userId: string, address: string) {
    const client: ConnectedClient = {
      socket,
      userId,
      address,
      joinedProjects: new Set(),
      lastActive: new Date(),
    };

    this.connectedClients.set(socket.id, client);
    this.logger.log(`Client connected: ${userId} (${address})`);

    // Send welcome message
    this.sendToClient(socket.id, WebSocketMessageType.USER_JOINED, {
      message: 'Connected to AI Music Platform',
      timestamp: new Date(),
    });
  }

  handleClientDisconnection(socketId: string) {
    const client = this.connectedClients.get(socketId);
    if (client) {
      // Leave all project rooms
      client.joinedProjects.forEach(projectId => {
        this.leaveProjectRoom(socketId, projectId);
      });

      this.connectedClients.delete(socketId);
      this.logger.log(`Client disconnected: ${client.userId}`);
    }
  }

  joinProjectRoom(socketId: string, projectId: string) {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    client.socket.join(`project:${projectId}`);
    client.joinedProjects.add(projectId);

    // Add to project room tracking
    if (!this.projectRooms.has(projectId)) {
      this.projectRooms.set(projectId, new Set());
    }
    this.projectRooms.get(projectId).add(socketId);

    this.logger.log(`Client ${client.userId} joined project room: ${projectId}`);

    // Notify other users in the project
    this.sendToProjectRoom(projectId, WebSocketMessageType.USER_JOINED, {
      userId: client.userId,
      address: client.address,
      projectId,
      timestamp: new Date(),
    }, socketId);
  }

  leaveProjectRoom(socketId: string, projectId: string) {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    client.socket.leave(`project:${projectId}`);
    client.joinedProjects.delete(projectId);

    // Remove from project room tracking
    const projectRoom = this.projectRooms.get(projectId);
    if (projectRoom) {
      projectRoom.delete(socketId);
      if (projectRoom.size === 0) {
        this.projectRooms.delete(projectId);
      }
    }

    this.logger.log(`Client ${client.userId} left project room: ${projectId}`);

    // Notify other users in the project
    this.sendToProjectRoom(projectId, WebSocketMessageType.USER_LEFT, {
      userId: client.userId,
      address: client.address,
      projectId,
      timestamp: new Date(),
    });
  }

  sendProjectUpdate(projectId: string, event: ProjectUpdateEvent) {
    this.sendToProjectRoom(projectId, WebSocketMessageType.PROJECT_UPDATE, event);
    this.logger.log(`Sent project update for ${projectId}: ${event.status}`);
  }

  sendAIProgress(projectId: string, event: AIProgressEvent) {
    this.sendToProjectRoom(projectId, WebSocketMessageType.AI_PROGRESS, event);
    this.logger.log(`Sent AI progress update for ${projectId} from ${event.agentAddress}`);
  }

  sendFileShared(projectId: string, event: FileSharedEvent) {
    this.sendToProjectRoom(projectId, WebSocketMessageType.FILE_SHARED, event);
    this.logger.log(`Sent file shared notification for ${projectId}: ${event.filename}`);
  }

  sendCollaborationRequest(projectId: string, event: CollaborationRequestEvent) {
    this.sendToProjectRoom(projectId, WebSocketMessageType.COLLABORATION_REQUEST, event);
    this.logger.log(`Sent collaboration request for ${projectId} from ${event.requesterAddress}`);
  }

  sendPaymentUpdate(projectId: string, event: PaymentUpdateEvent) {
    this.sendToProjectRoom(projectId, WebSocketMessageType.PAYMENT_UPDATE, event);
    this.logger.log(`Sent payment update for ${projectId}: ${event.amount} to ${event.recipientAddress}`);
  }

  sendChatMessage(projectId: string, message: any) {
    this.sendToProjectRoom(projectId, WebSocketMessageType.CHAT_MESSAGE, message);
  }

  sendToClient(socketId: string, type: WebSocketMessageType, payload: any) {
    const client = this.connectedClients.get(socketId);
    if (client) {
      const message: WebSocketMessage = {
        type,
        payload,
        timestamp: new Date(),
      };
      client.socket.emit('message', message);
      client.lastActive = new Date();
    }
  }

  sendToProjectRoom(projectId: string, type: WebSocketMessageType, payload: any, excludeSocketId?: string) {
    if (!this.server) return;

    const message: WebSocketMessage = {
      type,
      payload: {
        ...payload,
        projectId,
      },
      timestamp: new Date(),
    };

    if (excludeSocketId) {
      this.server.to(`project:${projectId}`).except(excludeSocketId).emit('message', message);
    } else {
      this.server.to(`project:${projectId}`).emit('message', message);
    }
  }

  sendToUser(userId: string, type: WebSocketMessageType, payload: any) {
    const client = Array.from(this.connectedClients.values()).find(c => c.userId === userId);
    if (client) {
      this.sendToClient(client.socket.id, type, payload);
    }
  }

  sendToAddress(address: string, type: WebSocketMessageType, payload: any) {
    const client = Array.from(this.connectedClients.values()).find(c => c.address.toLowerCase() === address.toLowerCase());
    if (client) {
      this.sendToClient(client.socket.id, type, payload);
    }
  }

  broadcastToAll(type: WebSocketMessageType, payload: any) {
    if (!this.server) return;

    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: new Date(),
    };

    this.server.emit('message', message);
    this.logger.log(`Broadcasted message to all clients: ${type}`);
  }

  getConnectedClients(): ConnectedClient[] {
    return Array.from(this.connectedClients.values());
  }

  getProjectRoomUsers(projectId: string): ConnectedClient[] {
    const socketIds = this.projectRooms.get(projectId) || new Set();
    return Array.from(socketIds)
      .map(socketId => this.connectedClients.get(socketId))
      .filter(client => client !== undefined) as ConnectedClient[];
  }

  isUserInProject(userId: string, projectId: string): boolean {
    const client = Array.from(this.connectedClients.values()).find(c => c.userId === userId);
    return client ? client.joinedProjects.has(projectId) : false;
  }

  getConnectionStats(): any {
    const totalConnections = this.connectedClients.size;
    const activeProjects = this.projectRooms.size;
    const clientsByProject = Array.from(this.projectRooms.entries()).map(([projectId, clients]) => ({
      projectId,
      clientCount: clients.size,
    }));

    return {
      totalConnections,
      activeProjects,
      clientsByProject,
      timestamp: new Date(),
    };
  }

  // Heartbeat mechanism to keep connections alive
  startHeartbeat() {
    setInterval(() => {
      this.connectedClients.forEach((client, socketId) => {
        const timeSinceLastActive = Date.now() - client.lastActive.getTime();
        
        // Ping inactive clients
        if (timeSinceLastActive > 30000) { // 30 seconds
          client.socket.emit('ping');
        }

        // Disconnect very inactive clients
        if (timeSinceLastActive > 300000) { // 5 minutes
          this.logger.warn(`Disconnecting inactive client: ${client.userId}`);
          client.socket.disconnect();
          this.handleClientDisconnection(socketId);
        }
      });
    }, 30000); // Check every 30 seconds
  }

  updateClientActivity(socketId: string) {
    const client = this.connectedClients.get(socketId);
    if (client) {
      client.lastActive = new Date();
    }
  }
}