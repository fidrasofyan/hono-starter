import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { z } from 'zod';
import { kysely } from '@/database';
import { validationFunc } from '@/lib/common';
import { userCan } from '@/middleware';
import { logActivity } from '@/service/logger';
import { websocketEmitToUser } from '@/service/websocket';
import type { JWTPayload } from '@/types';

const factory = createFactory();
const deleteRoleSchema = z.object({
  id: z.coerce.number({
    message: 'Hak akses tidak valid',
  }),
});

export const deleteRoleHandlers = factory.createHandlers(
  // Authorization
  userCan('user:delete'),

  // Validator
  validator('param', validationFunc(deleteRoleSchema)),

  // Handler
  async (c) => {
    const jwtPayload = c.get('jwtPayload') as JWTPayload;
    const param = c.req.valid('param');

    // Is role assigned to user?
    const userRole = await kysely
      .selectFrom('UserRole')
      .innerJoin('User', 'User.id', 'UserRole.userId')
      .select(['UserRole.roleId'])
      .where('UserRole.roleId', '=', param.id)
      .where('User.businessId', '=', jwtPayload.businessId)
      .executeTakeFirst();

    if (userRole) {
      return c.json(
        {
          message: 'Hak akses tidak dapat di hapus',
        },
        422,
      );
    }

    // Is role exist?
    const role = await kysely
      .selectFrom('Role')
      .select(['Role.id'])
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

    await kysely.transaction().execute(async (trx) => {
      // Delete role
      await trx
        .deleteFrom('Role')
        .where('id', '=', role.id)
        .executeTakeFirst();

      // Log activity
      await logActivity({
        businessId: jwtPayload.businessId,
        userId: jwtPayload.userId,
        action: 'role:delete',
        status: 'success',
        context: {
          id: role.id,
        },
      });
    });

    websocketEmitToUser({
      userId: jwtPayload.userId,
      event: 'role:deleted',
      payload: { id: role.id },
    });

    return c.json(
      {
        message: 'Hak akses berhasil di hapus',
      },
      200,
    );
  },
);
