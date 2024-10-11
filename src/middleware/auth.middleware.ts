import { createMiddleware } from 'hono/factory';
import config from '../config';
import { kysely } from '../database';
import type { JWTPayload } from '../types';
import { verifyJWT } from '../utils';

export const authMiddleware = createMiddleware(async (c, next) => {
  // Exclude routes
  if (
    [
      '/api/v1/example',
      '/api/v1/register',
      '/api/v1/login',
      '/api/v1/token',
    ].includes(c.req.path)
  ) {
    await next();
    return;
  }

  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json(
      {
        message: 'Token must be provided',
      },
      401,
    );
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return c.json(
      {
        message: 'Invalid token',
      },
      401,
    );
  }

  let decoded: JWTPayload;

  try {
    decoded = decoded = await verifyJWT(token, config.USER_TOKEN_SECRET_KEY);
  } catch (_error) {
    return c.json(
      {
        message: 'Invalid token',
      },
      401,
    );
  }

  const user = await kysely
    .selectFrom('user')
    .select(['id'])
    .where('id', '=', decoded.userId)
    .executeTakeFirst();

  if (!user) {
    return c.json(
      {
        message: 'User not found',
      },
      401,
    );
  }

  c.set('jwtPayload', decoded);

  await next();
});
