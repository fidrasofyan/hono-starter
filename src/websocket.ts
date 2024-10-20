import type { WebSocketHandler } from 'bun';
import config from './config';
import { kysely } from './database';
import { verifyJWT } from './lib/jwt';
import type { BunWebSocketData, JWTPayload } from './types';

export const websocketHandler: WebSocketHandler<BunWebSocketData> =
  {
    async open(ws) {
      if (!ws.data.refreshToken) {
        ws.send(
          JSON.stringify({
            event: 'error',
            data: {
              message: 'Token not found',
            },
          }),
        );
        ws.close();
        return;
      }

      let decoded: JWTPayload;

      try {
        decoded = decoded = await verifyJWT(
          ws.data.refreshToken,
          config.REFRESH_TOKEN_SECRET_KEY,
        );
      } catch (_error) {
        ws.send(
          JSON.stringify({
            event: 'error',
            data: {
              message: 'Invalid token',
            },
          }),
        );
        ws.close();
        return;
      }

      const user = await kysely
        .selectFrom('user')
        .innerJoin(
          'business',
          'business.businessId',
          'user.businessId',
        )
        .select([
          'user.userId',
          'user.isActive',
          'business.isActive as businessIsActive',
        ])
        .where('user.userId', '=', decoded.userId)
        .executeTakeFirst();

      if (!user) {
        ws.send(
          JSON.stringify({
            event: 'error',
            data: {
              message: 'User not found',
            },
          }),
        );
        ws.close();
        return;
      }

      if (!user.businessIsActive) {
        ws.send(
          JSON.stringify({
            event: 'error',
            data: {
              message: 'Business not active',
            },
          }),
        );
        ws.close();
        return;
      }

      if (!user.isActive) {
        ws.send(
          JSON.stringify({
            event: 'error',
            data: {
              message: 'User not active',
            },
          }),
        );
        ws.close();
        return;
      }

      ws.subscribe('default');
      ws.subscribe(`user:${user.userId}`);

      if (config.NODE_ENV === 'development') {
        console.log(
          `websocket # user:${user.userId} connected`,
        );
      }
    },
    message(ws, message) {
      if (message === 'ping') {
        ws.send('pong');
      }
    },
  };
