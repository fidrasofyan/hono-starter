import { kysely } from '@/database';
import { escapeHTML } from '@/utils/common';
import { hashPassword } from '@/utils/hashing';
import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { z } from 'zod';

const factory = createFactory();
const registerSchema = z.object({
  username: z
    .string({
      message: 'Invalid username',
    })
    .min(1, {
      message: 'Username cannot be empty',
    })
    .max(100, {
      message: 'Username cannot be longer than 100 characters',
    }),
  password: z
    .string({
      message: 'Invalid password',
    })
    .min(1, {
      message: 'Password cannot be empty',
    }),
});

export const registerHandlers = factory.createHandlers(
  // Validator
  validator('json', (value, c) => {
    const parsed = registerSchema.safeParse(value);
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

    // If username already exists
    if (
      await kysely
        .selectFrom('user')
        .where('username', '=', dto.username)
        .executeTakeFirst()
    ) {
      return c.json(
        {
          message: 'Username already exists',
        },
        400,
      );
    }

    const date = new Date();

    await kysely
      .insertInto('user')
      .values({
        username: escapeHTML(dto.username),
        password: await hashPassword(dto.password),
        created_at: date,
        updated_at: date,
      })
      .execute();

    return c.json(
      {
        message: 'User created',
      },
      200,
    );
  },
);
