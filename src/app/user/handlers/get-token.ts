import config from '@/config';
import { kysely } from '@/database';
import { appValidator } from '@/lib/common';
import { generateJWT, verifyJWT } from '@/lib/jwt';
import type { JWTPayload } from '@/types';
import { createFactory } from 'hono/factory';
import { z } from 'zod';

const factory = createFactory();
const getTokenSchema = z.object({
  authorization: z.string({
    message: 'Authorization header tidak valid',
  }),
});

export const getTokenHandlers = factory.createHandlers(
  // Validator
  appValidator('header', getTokenSchema),
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
        'business.businessId',
        'user.businessId',
      )
      .select([
        'userId',
        'user.isActive',
        'business.businessId',
        'business.isActive as businessIsActive',
      ])
      .where('userId', '=', decoded.userId)
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
          message: 'Aplikasi tidak aktif',
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

    return c.json(
      {
        data: {
          token: await generateJWT(
            {
              iat: Math.floor(Date.now() / 1000),
              exp:
                Math.floor(Date.now() / 1000) +
                60 * config.TOKEN_EXPIRES_IN_MINUTES,
              businessId: user.businessId,
              userId: user.userId,
            },
            config.TOKEN_SECRET_KEY,
          ),
        },
      },
      200,
    );
  },
);
