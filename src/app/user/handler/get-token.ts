import { getCookie, setCookie } from 'hono/cookie';
import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { z } from 'zod';
import config from '@/config';
import { kysely } from '@/database';
import { validationFunc } from '@/lib/common';
import { generateJWT, verifyJWT } from '@/lib/jwt';
import type { JWTPayload } from '@/types';

const factory = createFactory();
const getTokenHeaderSchema = z.object({
  authorization: z
    .string({
      error: 'Authorization header tidak valid',
    })
    .optional(),
});
const getTokenQuerySchema = z.object({
  type: z
    .enum(['token', 'cookie'], {
      error: 'Tipe login tidak valid',
    })
    .optional(),
  expiresIn: z.coerce
    .number({
      error: 'Waktu kadaluarsa tidak valid',
    })
    .min(1, {
      error: 'Waktu kadaluarsa minimal 1 menit',
    })
    .max(10, {
      error: 'Waktu kadaluarsa maksimal 10 menit',
    })
    .optional(),
});

export const getTokenHandlers = factory.createHandlers(
  // Validator
  validator('header', validationFunc(getTokenHeaderSchema)),
  validator('query', validationFunc(getTokenQuerySchema)),

  // Handler
  async (c) => {
    const header = c.req.valid('header');
    const query = c.req.valid('query');

    // Get refresh token from cookie
    let refreshToken = getCookie(c, 'refreshToken');

    // Get refresh token from header if cookie is not found
    if (!refreshToken) {
      refreshToken = header.authorization?.split(' ')[1];

      if (!refreshToken) {
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
        refreshToken,
        config.REFRESH_TOKEN_SECRET_KEY,
      );
    } catch (_error) {
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
        'Business.id as businessId',
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

    const expiresInMinutes =
      query.expiresIn ?? config.TOKEN_EXPIRES_IN_MINUTES;

    const token = await generateJWT(
      {
        iat: Math.floor(Date.now() / 1000),
        exp:
          Math.floor(Date.now() / 1000) +
          60 * expiresInMinutes,
        businessId: user.businessId,
        userId: user.id,
      },
      config.TOKEN_SECRET_KEY,
    );

    if (query.type === 'token') {
      return c.json(
        {
          data: {
            token,
          },
        },
        200,
      );
    }

    setCookie(c, 'token', token, {
      ...config.COOKIE_OPTIONS,
      maxAge: expiresInMinutes * 60,
    });

    return c.json({}, 200);
  },
);
