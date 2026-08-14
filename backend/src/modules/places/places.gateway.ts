import {
  ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway,
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

/**
 * Lets a user on the Spots map opt into live counts for the pins they can
 * see. The server already broadcasts `place:count` to `place:<id>` rooms
 * whenever a checkin/leave/expiry happens (see CheckinService); these two
 * events just toggle room membership.
 *
 * The spec also mentions a batched `places:counts` event — that lands when
 * we wire the metrics dashboard in Step 12; the per-pin per-room shape
 * works fine for the user surface today.
 */
class PlacesSubscribeDto {
  @IsArray() @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  placeIds!: string[];
}

@WebSocketGateway({
  namespace: '/rt',
  cors: { origin: true, credentials: true },
  transports: ['websocket'],
})
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class PlacesGateway {
  @SubscribeMessage('subscribe:places')
  async onSubscribe(@ConnectedSocket() socket: Socket, @MessageBody() body: PlacesSubscribeDto) {
    for (const id of body.placeIds) await socket.join(`place:${id}`);
    return { ok: true, joined: body.placeIds.length };
  }

  @SubscribeMessage('unsubscribe:places')
  async onUnsubscribe(@ConnectedSocket() socket: Socket, @MessageBody() body: PlacesSubscribeDto) {
    for (const id of body.placeIds) await socket.leave(`place:${id}`);
    return { ok: true, left: body.placeIds.length };
  }
}
