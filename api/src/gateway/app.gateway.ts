import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: [
      'https://xvistoria.com.br',
      'https://admin.xvistoria.com.br',
      'https://sindico.xvistoria.com.br',
      'https://app.xvistoria.com.br',
      ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003']),
    ],
    credentials: true,
  },
  namespace: '/',
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token
        || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.user = payload;

      // Entra na sala da empresa
      client.join(`empresa:${payload.empresa_id}`);

      // Se supervisor, entra em sala própria
      if (payload.role === 'supervisor') {
        client.join(`supervisor:${payload.sub}`);
      }

      this.logger.log(`WS conectado: ${payload.email} (${payload.role})`);
    } catch (e) {
      this.logger.warn(`WS auth failed: ${e}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.user) {
      this.logger.log(`WS desconectado: ${client.data.user.email}`);
    }
  }

  @SubscribeMessage('join:visita')
  joinVisita(@MessageBody() visitaId: string, @ConnectedSocket() client: Socket) {
    client.join(`visita:${visitaId}`);
  }

  @SubscribeMessage('leave:visita')
  leaveVisita(@MessageBody() visitaId: string, @ConnectedSocket() client: Socket) {
    client.leave(`visita:${visitaId}`);
  }

  emitParaEmpresa(empresaId: string, evento: string, dados: any) {
    this.server.to(`empresa:${empresaId}`).emit(evento, dados);
  }

  emitParaVisita(visitaId: string, evento: string, dados: any) {
    this.server.to(`visita:${visitaId}`).emit(evento, dados);
  }

  emitParaSupervisor(supervisorId: string, evento: string, dados: any) {
    this.server.to(`supervisor:${supervisorId}`).emit(evento, dados);
  }
}
