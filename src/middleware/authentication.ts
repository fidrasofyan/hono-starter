import { deleteCookie, getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import config from '@/config';
import { kysely } from '@/database';
import { verifyJWT } from '@/lib/jwt';
import type { JWTPayload } from '@/types';

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

    // Get token from cookie
    let token = getCookie(c, 'token');

    // Get token from header if cookie is not found
    if (!token) {
      const authHeader = c.req.header('Authorization');

      if (!authHeader) {
        return c.json(
          {
            message: 'Unauthenticated',
          },
          401,
        );
      }

      token = authHeader.split(' ')[1];

      if (!token) {
        return c.json(
          {
            message: 'Unauthenticated',
          },
          401,
        );
      }
    }

    let decoded: JWTPayload;

    try {
      decoded = await verifyJWT(
        token,
        config.TOKEN_SECRET_KEY,
      );
    } catch (_error) {
      deleteCookie(c, 'token');

      return c.json(
        {
          message: 'Invalid session',
        },
        401,
      );
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
      return c.json(
        {
          message: 'User tidak ditemukan',
        },
        401,
      );
    }

    if (!user.businessIsActive) {
      return c.json(
        {
          message: 'Akun bisnis tidak aktif',
        },
        401,
      );
    }

    if (!user.isActive) {
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
