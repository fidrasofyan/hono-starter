import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { z } from 'zod';
import config from '@/config';
import { kysely } from '@/database';
import { validationFunc } from '@/lib/common';
import { verifyPassword } from '@/lib/hashing';
import { generateJWT } from '@/lib/jwt';

const factory = createFactory();
const loginSchema = z.object({
  emailOrUsername: z
    .string({
      message: 'Email/username harus diisi',
    })
    .min(1, {
      message: 'Email/username harus diisi',
    })
    .max(50, {
      message: 'Email/username tidak valid',
    }),
  password: z
    .string({
      message: 'Password harus diisi',
    })
    .min(1, {
      message: 'Password harus diisi',
    })
    .max(50, {
      message: 'Password tidak valid',
    }),
});

export const loginHandlers = factory.createHandlers(
  // Validator
  validator('json', validationFunc(loginSchema)),

  // Handler
  async (c) => {
    const body = c.req.valid('json');

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
        'User.username',
        'User.password',
        'Business.id as businessId',
        'Business.isActive as businessIsActive',
      ])
      .where((eb) =>
        eb.or([
          eb('username', '=', body.emailOrUsername),
          eb('email', '=', body.emailOrUsername),
        ]),
      )
      .executeTakeFirst();

    if (!user) {
      return c.json(
        {
          message: 'Kredensial tidak valid',
        },
        422,
      );
    }

    if (!user.password) {
      return c.json(
        {
          message:
            'Akun tidak support login dengan password',
        },
        422,
      );
    }

    if (!user.businessIsActive) {
      return c.json(
        {
          message: 'Akun bisnis tidak aktif',
        },
        422,
      );
    }

    if (
      !(await verifyPassword(body.password, user.password))
    ) {
      return c.json(
        {
          message: 'Kredensial tidak valid',
        },
        422,
      );
    }

    if (!user.isActive) {
      return c.json(
        {
          message: 'User tidak aktif',
        },
        422,
      );
    }

    return c.json(
      {
        message: 'Login berhasil!',
        data: {
          token: await generateJWT(
            {
              iat: Math.floor(Date.now() / 1000),
              exp:
                Math.floor(Date.now() / 1000) +
                60 * config.TOKEN_EXPIRES_IN_MINUTES,
              businessId: user.businessId,
              userId: user.id,
            },
            config.TOKEN_SECRET_KEY,
          ),
          refreshToken: await generateJWT(
            {
              iat: Math.floor(Date.now() / 1000),
              exp:
                Math.floor(Date.now() / 1000) +
                60 *
                  60 *
                  24 *
                  config.REFRESH_TOKEN_EXPIRES_IN_DAYS,
              businessId: user.businessId,
              userId: user.id,
            },
            config.REFRESH_TOKEN_SECRET_KEY,
          ),
        },
      },
      200,
    );
  },
);
