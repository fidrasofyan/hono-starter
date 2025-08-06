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
const deleteUserSchema = z.object({
  id: z.coerce.number({
    message: 'Hak akses tidak valid',
  }),
});

export const deleteUserHandlers = factory.createHandlers(
  // Authorization
  userCan('user:delete'),

  // Validator
  validator('param', validationFunc(deleteUserSchema)),

  // Handler
  async (c) => {
    const jwtPayload = c.get('jwtPayload') as JWTPayload;
    const param = c.req.valid('param');

    // Is user exist?
    const user = await kysely
      .selectFrom('User')
      .select(['User.id'])
      .where('User.id', '=', param.id)
      .where('User.businessId', '=', jwtPayload.businessId)
      .executeTakeFirst();

    if (!user) {
      return c.json(
        {
          message: 'User tidak ditemukan',
        },
        422,
      );
    }

    // Prevent deleting self
    if (user.id === jwtPayload.userId) {
      return c.json(
        {
          message: 'Tidak dapat menghapus diri sendiri',
        },
        422,
      );
    }

    await kysely.transaction().execute(async (trx) => {
      await trx
        .deleteFrom('User')
        .where('id', '=', param.id)
        .where('businessId', '=', jwtPayload.businessId)
        .executeTakeFirst();

      await logActivity({
        businessId: jwtPayload.businessId,
        userId: jwtPayload.userId,
        action: 'user:delete',
        status: 'success',
        context: {
          id: user.id,
        },
      });
    });

    websocketEmitToUser({
      userId: jwtPayload.userId,
      event: 'user:deleted',
      payload: { id: param.id },
    });

    return c.json(
      {
        message: 'User berhasil dihapus',
      },
      200,
    );
  },
);
