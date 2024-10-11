import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { z } from 'zod';
import config from '../../../config';
import { kysely } from '../../../database';
import { verifyPassword } from '../../../utils';
import { generateJWT } from '../../../utils';

const factory = createFactory();
const loginSchema = z.object({
  username: z
    .string({
      message: 'Username tidak valid',
    })
    .min(1, {
      message: 'Username tidak boleh kosong',
    })
    .max(100, {
      message: 'Username cannot be longer than 100 characters',
    }),
  password: z
    .string({
      message: 'Password tidak valid',
    })
    .min(1, {
      message: 'Password tidak boleh kosong',
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
      .select(['id', 'username', 'password'])
      .where('username', '=', dto.username)
      .executeTakeFirst();

    if (!user) {
      return c.json(
        {
          message: 'Username/password invalid',
        },
        422,
      );
    }

    if (!(await verifyPassword(dto.password, user.password))) {
      return c.json(
        {
          message: 'Username/password invalid',
        },
        422,
      );
    }

    return c.json(
      {
        message: 'Login successful',
        data: {
          token: await generateJWT(
            {
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes
              userId: user.id,
            },
            config.USER_TOKEN_SECRET_KEY,
          ),
          refresh_token: await generateJWT(
            {
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
              userId: user.id,
            },
            config.USER_REFRESH_TOKEN_SECRET_KEY,
          ),
        },
      },
      200,
    );
  },
);
