import { createFactory } from 'hono/factory';
import { kysely } from '@/database';
import { userCan } from '@/middleware';

const factory = createFactory();

export const getPermissionsHandlers =
  factory.createHandlers(
    // Authorization
    userCan('user:read'),

    // Handler
    async (c) => {
      return c.json(
        {
          data: await kysely
            .selectFrom('Permission')
            .select(['id', 'name'])
            .orderBy('name', 'asc')
            .execute(),
        },
        200,
      );
    },
  );
