import { kysely } from '@/database';
import { validationFunc } from '@/lib/common';
import {
  hashPassword,
  verifyPassword,
} from '@/lib/hashing';
import { userCan } from '@/middleware';
import { logActivity } from '@/service/logger';
import { websocketEmitToUser } from '@/service/websocket';
import type { JWTPayload } from '@/types';
import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { z } from 'zod';

const factory = createFactory();
const changePasswordParamSchema = z.object({
  id: z.number({
    coerce: true,
    message: 'ID User tidak valid',
  }),
});
const changePasswordBodySchema = z.object({
  oldPassword: z
    .string({
      message: 'Password lama tidak valid',
    })
    .min(1, {
      message: 'Password lama harus diisi',
    })
    .max(20, {
      message: 'Password lama tidak valid',
    }),
  newPassword: z
    .string({
      message: 'Password baru tidak valid',
    })
    .min(8, {
      message: 'Password baru minimal 8 karakter',
    })
    .max(20, {
      message: 'Password baru tidak valid',
    }),
});

export const changePasswordHandlers =
  factory.createHandlers(
    // Authorization
    userCan('user:update'),

    // Validator
    validator(
      'param',
      validationFunc(changePasswordParamSchema),
    ),
    validator(
      'json',
      validationFunc(changePasswordBodySchema),
    ),

    // Handler
    async (c) => {
      const jwtPayload = c.get('jwtPayload') as JWTPayload;
      const param = c.req.valid('param');
      const body = c.req.valid('json');

      // Is user exist?
      const user = await kysely
        .selectFrom('User')
        .select(['id', 'password'])
        .where('id', '=', param.id)
        .where('businessId', '=', jwtPayload.businessId)
        .executeTakeFirst();

      if (!user) {
        return c.json(
          {
            message: 'User tidak ditemukan',
          },
          422,
        );
      }

      // Is password correct?
      if (user.password) {
        const isPasswordCorrect = await verifyPassword(
          body.oldPassword,
          user.password,
        );

        if (!isPasswordCorrect) {
          return c.json(
            {
              message: 'Password lama tidak sesuai',
            },
            422,
          );
        }
      }

      await kysely.transaction().execute(async (trx) => {
        // Update password
        await trx
          .updateTable('User')
          .set({
            password: await hashPassword(body.newPassword),
            updatedAt: new Date(),
            updatedBy: jwtPayload.userId,
          })
          .where('id', '=', user.id)
          .executeTakeFirstOrThrow();

        await logActivity({
          businessId: jwtPayload.businessId,
          userId: jwtPayload.userId,
          action: 'user:update-password',
          status: 'success',
          context: {
            id: user.id,
          },
        });
      });

      websocketEmitToUser({
        userId: jwtPayload.userId,
        event: 'user:updated',
        payload: { id: user.id },
      });

      return c.json(
        {
          message: 'Password berhasil diubah',
        },
        200,
      );
    },
  );
