import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { jsonArrayFrom } from 'kysely/helpers/postgres';
import { z } from 'zod';
import { kysely } from '@/database';
import { validationFunc } from '@/lib/common';
import { userCan } from '@/middleware';
import type { JWTPayload } from '@/types';

const factory = createFactory();
const getUserDetailSchema = z.object({
  id: z.coerce.number({
    message: 'User tidak valid',
  }),
});

export const getUserDetailHandlers = factory.createHandlers(
  // Authorization
  userCan('user:read'),

  // Validator
  validator('param', validationFunc(getUserDetailSchema)),

  // Handler
  async (c) => {
    const jwtPayload = c.get('jwtPayload') as JWTPayload;
    const param = c.req.valid('param');

    const user = await kysely
      .selectFrom('User')
      .select(({ eb }) => [
        'User.id',
        'User.isActive',
        'User.email',
        'User.username',
        'User.firstName',
        'User.lastName',
        'User.createdAt',
        'User.updatedAt',
        jsonArrayFrom(
          eb
            .selectFrom('Role')
            .innerJoin(
              'UserRole',
              'UserRole.roleId',
              'Role.id',
            )
            .select(['Role.id', 'Role.name'])
            .whereRef('UserRole.userId', '=', 'User.id'),
        ).as('roles'),
      ])
      .where('User.id', '=', param.id)
      .where('User.businessId', '=', jwtPayload.businessId)
      .executeTakeFirst();

    if (!user) {
      return c.json(
        {
          message: 'User tidak ditemukan',
        },
        404,
      );
    }

    return c.json(
      {
        data: user,
      },
      200,
    );
  },
);
