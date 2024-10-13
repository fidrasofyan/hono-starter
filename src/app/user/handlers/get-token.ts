import config from '@/config';
import { kysely } from '@/database';
import type { JWTPayload } from '@/types';
import { generateJWT, verifyJWT } from '@/utils/jwt';
import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { z } from 'zod';

const factory = createFactory();
const getTokenSchema = z.object({
  authorization: z.string({
    message: 'Invalid authorization header',
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
          message: 'Invalid token',
        },
        400,
      );
    }

    let decoded: JWTPayload;

    try {
      decoded = decoded = await verifyJWT(
        token,
        config.USER_REFRESH_TOKEN_SECRET_KEY,
      );
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

    return c.json(
      {
        data: {
          token: await generateJWT(
            {
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes
              userId: user.id,
            },
            config.USER_TOKEN_SECRET_KEY,
          ),
        },
      },
      200,
    );
  },
);
