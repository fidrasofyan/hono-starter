import { kysely } from '@/database';
import { userCan } from '@/middleware';
import { createFactory } from 'hono/factory';

const factory = createFactory();

export const getRolesHandlers = factory.createHandlers(
  // Authorization
  userCan('user:read'),

  // Handler
  async (c) => {
    return c.json(
      {
        data: await kysely
          .selectFrom('Role')
          .select([
            'id',
            'name',
            'description',
            'createdAt',
            'updatedAt',
          ])
          .limit(50)
          .execute(),
      },
      200,
    );
  },
);
