import type { WebSocketHandler } from 'bun';
import config from './config';
import { kysely } from './database';
import { verifyJWT } from './lib/jwt';
import type { BunWebSocketData, JWTPayload } from './types';

export const websocketHandler: WebSocketHandler<BunWebSocketData> =
  {
    idleTimeout: 120, // 120 seconds
    async open(ws) {
      if (!ws.data.token) {
        ws.close(4001, 'Token not found');
        return;
      }

      let decoded: JWTPayload;

      try {
        decoded = await verifyJWT(
          ws.data.token,
          config.TOKEN_SECRET_KEY,
        );
      } catch (_error) {
        ws.close(4001, 'Invalid token');
        return;
      }

      const user = await kysely
        .selectFrom('User')
        .innerJoin(
          'Business',
          'Business.id',
          'User.businessId',
        )
        .select([
          'User.id',
          'User.isActive',
          'Business.isActive as businessIsActive',
        ])
        .where('User.id', '=', decoded.userId)
        .where('Business.id', '=', decoded.businessId)
        .executeTakeFirst();

      if (!user) {
        ws.close(4004, 'User not found');
        return;
      }

      if (!user.businessIsActive) {
        ws.close(4022, 'Business not active');
        return;
      }

      if (!user.isActive) {
        ws.close(4022, 'User not active');
        return;
      }

      ws.subscribe('default');
      ws.subscribe(`user:${user.id}`);

      if (config.NODE_ENV === 'development') {
        console.log(
          `* WEBSOCKET user:${user.id} connected`,
        );
      }
    },
    message(ws, message) {
      // Heartbeat
      if (message === 'ping') {
        ws.send('pong');
      }

      if (
        config.NODE_ENV === 'development' &&
        message !== 'ping'
      ) {
        console.log(
          `* WEBSOCKET ${ws.remoteAddress} message:`,
          message,
        );
      }
    },
  };
