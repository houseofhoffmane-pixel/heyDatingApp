import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { WsSendMessageDto } from './dto/send-message.dto';
import { WsMarkReadDto } from './dto/mark-read.dto';
import { WsTypingDto } from './dto/typing.dto';

/**
 * Live chat handlers — share the `/rt` namespace with RealtimeGateway. Nest
 * routes each event to the gateway that registered it via @SubscribeMessage,
 * so this file owns chat plumbing without touching RealtimeGateway's
 * connection lifecycle.
 *
 * Each handler returns an ack object — Socket.IO surfaces it to the client
 * callback:
 *   sock.emit('message:send', payload, (ack) => …)
 * which lets the offline-retry path know whether the send was a fresh
 * write or a dedupe.
 */
@WebSocketGateway({
  namespace: '/rt',
  cors: { origin: true, credentials: true },
  transports: ['websocket'],
})
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ChatGateway {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chat: ChatService) {}

  @SubscribeMessage('message:send')
  async onSend(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: WsSendMessageDto,
  ) {
    const userId = socket.data.userId as string;
    try {
      const result = await this.chat.sendMessage(userId, body.matchId, {
        clientId: body.clientId,
        body: body.body,
        kind: body.kind ?? 'text',
      });
      return { ok: true, ...result };
    } catch (err: any) {
      this.logger.warn(`message:send failed user=${userId} match=${body.matchId}: ${err?.message}`);
      return { ok: false, error: serializeError(err) };
    }
  }

  @SubscribeMessage('message:read')
  async onRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: WsMarkReadDto,
  ) {
    const userId = socket.data.userId as string;
    try {
      const result = await this.chat.markRead(userId, body.matchId, body.upToMessageId);
      return { ok: true, ...result };
    } catch (err: any) {
      return { ok: false, error: serializeError(err) };
    }
  }

  @SubscribeMessage('typing:start')
  async onTypingStart(@ConnectedSocket() socket: Socket, @MessageBody() body: WsTypingDto) {
    const userId = socket.data.userId as string;
    try { await this.chat.relayTyping(userId, body.matchId, 'start'); } catch { /* ignore typing errors */ }
    return { ok: true };
  }

  @SubscribeMessage('typing:stop')
  async onTypingStop(@ConnectedSocket() socket: Socket, @MessageBody() body: WsTypingDto) {
    const userId = socket.data.userId as string;
    try { await this.chat.relayTyping(userId, body.matchId, 'stop'); } catch { /* ignore */ }
    return { ok: true };
  }
}

function serializeError(err: any) {
  const response = err?.getResponse?.();
  if (response?.error) return response.error;
  return { code: 'UNKNOWN', message: err?.message ?? 'Unknown error' };
}
