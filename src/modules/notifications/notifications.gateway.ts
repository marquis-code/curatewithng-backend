import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedUsers = new Map<string, string[]>(); // userId -> socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;
      client.data.userId = userId;

      // Join a room specifically for this user
      client.join(`user_${userId}`);
      
      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error(`Connection failed for ${client.id}: ${(error as any).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private extractTokenFromSocket(client: Socket): string | undefined {
    // Check Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    // Check auth payload (socket.io v3+)
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }
    // Check query params
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }
    return undefined;
  }

  /**
   * Emit a new notification to a specific user
   */
  emitToUser(userId: string, event: string, payload: any) {
    this.server.to(`user_${userId}`).emit(event, payload);
  }

  /**
   * Check if a user has any active socket connections
   */
  async isUserOnline(userId: string): Promise<boolean> {
    try {
      const sockets = await this.server.in(`user_${userId}`).fetchSockets();
      return sockets.length > 0;
    } catch (error) {
      this.logger.error(`Failed to check if user is online: ${error}`);
      return false;
    }
  }
}
