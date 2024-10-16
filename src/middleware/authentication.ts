import config from '@/config';
import { kysely } from '@/database';
import { verifyJWT } from '@/lib/jwt';
import type { JWTPayload } from '@/types';
import { createMiddleware } from 'hono/factory';

export const authenticationMiddleware = createMiddleware(
  async (c, next) => {
    // Exclude routes
    if (
      ['/api/v1/login', '/api/v1/token'].includes(
        c.req.path,
      )
    ) {
      await next();
      return;
    }

    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      return c.json(
        {
          message: 'Token tidak ditemukan',
        },
        401,
      );
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return c.json(
        {
          message: 'Token tidak valid',
        },
        401,
      );
    }

    let decoded: JWTPayload;

    try {
      decoded = await verifyJWT(
        token,
        config.USER_TOKEN_SECRET_KEY,
      );
    } catch (_error) {
      return c.json(
        {
          message: 'Token tidak valid',
        },
        401,
      );
    }

    const user = await kysely
      .selectFrom('user')
      .innerJoin(
        'business',
        'business.business_id',
        'user.business_id',
      )
      .select([
        'user.user_id',
        'user.is_active',
        'business.is_active as business_is_active',
      ])
      .where('user_id', '=', decoded.user_id)
      .executeTakeFirst();

    if (!user) {
      return c.json(
        {
          message: 'User tidak ditemukan',
        },
        401,
      );
    }

    if (!user.business_is_active) {
      return c.json(
        {
          message: 'Aplikasi tidak aktif',
        },
        401,
      );
    }

    if (!user.is_active) {
      return c.json(
        {
          message: 'User tidak aktif',
        },
        401,
      );
    }

    c.set('jwtPayload', decoded);

    await next();
  },
);
