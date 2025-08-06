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
  authorization: z.string({
    message: 'Authorization header tidak valid',
  }),
});
const getTokenQuerySchema = z.object({
  expiresIn: z.coerce
    .number({
      message: 'Waktu kadaluarsa tidak valid',
    })
    .min(1, {
      message: 'Waktu kadaluarsa minimal 1 menit',
    })
    .max(10, {
      message: 'Waktu kadaluarsa maksimal 10 menit',
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

    const token = header.authorization.split(' ')[1];

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

    const expiresIn =
      query.expiresIn ?? config.TOKEN_EXPIRES_IN_MINUTES;

    return c.json(
      {
        data: {
          token: await generateJWT(
            {
              iat: Math.floor(Date.now() / 1000),
              exp:
                Math.floor(Date.now() / 1000) +
                60 * expiresIn,
              businessId: user.businessId,
              userId: user.id,
            },
            config.TOKEN_SECRET_KEY,
          ),
        },
      },
      200,
    );
  },
);
