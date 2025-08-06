import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { jsonArrayFrom } from 'kysely/helpers/postgres';
import { z } from 'zod';
import { kysely } from '@/database';
import { validationFunc } from '@/lib/common';
import { userCan } from '@/middleware';
import type { JWTPayload } from '@/types';

const factory = createFactory();
const getRoleDetailSchema = z.object({
  id: z.coerce.number({
    message: 'Hak akses tidak valid',
  }),
});

export const getRoleDetailHandlers = factory.createHandlers(
  // Authorization
  userCan('user:read'),

  // Validator
  validator('param', validationFunc(getRoleDetailSchema)),

  // Handler
  async (c) => {
    const jwtPayload = c.get('jwtPayload') as JWTPayload;
    const param = c.req.valid('param');

    const role = await kysely
      .selectFrom('Role')
      .select(({ eb }) => [
        'Role.id',
        'Role.name',
        'Role.description',
        'Role.createdAt',
        'Role.updatedAt',
        jsonArrayFrom(
          eb
            .selectFrom('RolePermission')
            .innerJoin(
              'Permission',
              'Permission.id',
              'RolePermission.permissionId',
            )
            .select(['Permission.id', 'Permission.name'])
            .select(['Permission.id', 'Permission.name'])
            .whereRef(
              'RolePermission.roleId',
              '=',
              'Role.id',
            ),
        ).as('permissions'),
      ])
      .where('Role.id', '=', param.id)
      .where('Role.businessId', '=', jwtPayload.businessId)
      .executeTakeFirst();

    if (!role) {
      return c.json(
        {
          message: 'Hak akses tidak ditemukan',
        },
        422,
      );
    }

    return c.json(
      {
        data: role,
      },
      200,
    );
  },
);
