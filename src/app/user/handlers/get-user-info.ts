import { kysely } from '@/database';
import type { JWTPayload } from '@/types';
import { createFactory } from 'hono/factory';

const factory = createFactory();

export const getUserInfoHandlers = factory.createHandlers(
  // Handler
  async (c) => {
    const jwtPayload = c.var.jwtPayload as JWTPayload;

    const user = await kysely
      .selectFrom('user')
      .select([
        'username',
        'first_name',
        'last_name',
        'created_at',
        'updated_at',
      ])
      .where('user_id', '=', jwtPayload.user_id)
      .executeTakeFirst();

    return c.json(
      {
        data: user,
      },
      200,
    );
  },
);
