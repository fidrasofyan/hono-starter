import config from '@/config';
import { kysely } from '@/database';
import { generateJWT, verifyJWT } from '@/lib/jwt';
import type { JWTPayload } from '@/types';
import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { z } from 'zod';

const factory = createFactory();
const getTokenSchema = z.object({
  authorization: z.string({
    message: 'Authorization header tidak valid',
  }),
});

export const getTokenHandlers = factory.createHandlers(
  // Validator
  validator('header', (value, c) => {
    const parsed = getTokenSchema.safeParse(value);
    if (!parsed.success) {
      return c.json(
        {
          message: parsed.error.errors[0].message,
        },
        400,
      );
    }
    return parsed.data;
  }),
  // Handler
  async (c) => {
    const headers = c.req.valid('header');

    const token = headers.authorization.split(' ')[1];

    if (!token) {
      return c.json(
        {
          message: 'Token tidak valid',
        },
        400,
      );
    }

    let decoded: JWTPayload;

    try {
      decoded = decoded = await verifyJWT(
        token,
        config.REFRESH_TOKEN_SECRET_KEY,
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
        'user_id',
        'user.is_active',
        'business.business_id',
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

    return c.json(
      {
        data: {
          token: await generateJWT(
            {
              iat: Math.floor(Date.now() / 1000),
              exp:
                Math.floor(Date.now() / 1000) +
                60 * config.TOKEN_EXPIRES_IN_MINUTES,
              business_id: user.business_id,
              user_id: user.user_id,
            },
            config.TOKEN_SECRET_KEY,
          ),
        },
      },
      200,
    );
  },
);
