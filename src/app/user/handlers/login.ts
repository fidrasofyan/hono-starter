import config from '@/config';
import { kysely } from '@/database';
import { verifyPassword } from '@/lib/hashing';
import { generateJWT } from '@/lib/jwt';
import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { z } from 'zod';

const factory = createFactory();
const loginSchema = z.object({
  username: z
    .string({
      message: 'Username/password tidak valid',
    })
    .min(1, {
      message: 'Username harus diisi',
    })
    .max(50, {
      message: 'Username/password tidak valid',
    }),
  password: z
    .string({
      message: 'Username/password tidak valid',
    })
    .min(1, {
      message: 'Username harus diisi',
    })
    .max(50, {
      message: 'Username/password tidak valid',
    }),
});

export const loginHandlers = factory.createHandlers(
  // Validator
  validator('json', (value, c) => {
    const parsed = loginSchema.safeParse(value);
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
    const dto = c.req.valid('json');

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
        'user.username',
        'user.password',
        'business.business_id',
        'business.is_active as business_is_active',
      ])
      .where('username', '=', dto.username)
      .executeTakeFirst();

    if (!user) {
      return c.json(
        {
          message: 'Username/password tidak valid',
        },
        422,
      );
    }

    if (!user.business_is_active) {
      return c.json(
        {
          message: 'Aplikasi tidak aktif',
        },
        422,
      );
    }

    if (
      !(await verifyPassword(dto.password, user.password))
    ) {
      return c.json(
        {
          message: 'Username/password tidak valid',
        },
        422,
      );
    }

    if (!user.is_active) {
      return c.json(
        {
          message: 'User tidak aktif',
        },
        422,
      );
    }

    return c.json(
      {
        message: 'Login berhasil',
        data: {
          token: await generateJWT(
            {
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes
              business_id: user.business_id,
              user_id: user.user_id,
            },
            config.USER_TOKEN_SECRET_KEY,
          ),
          refresh_token: await generateJWT(
            {
              iat: Math.floor(Date.now() / 1000),
              exp:
                Math.floor(Date.now() / 1000) +
                60 * 60 * 24 * 30, // 30 days
              business_id: user.business_id,
              user_id: user.user_id,
            },
            config.USER_REFRESH_TOKEN_SECRET_KEY,
          ),
        },
      },
      200,
    );
  },
);
