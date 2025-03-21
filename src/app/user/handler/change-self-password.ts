import { kysely } from '@/database';
import { validationFunc } from '@/lib/common';
import {
  hashPassword,
  verifyPassword,
} from '@/lib/hashing';
import { logActivity } from '@/service/logger';
import { websocketEmitToUser } from '@/service/websocket';
import type { JWTPayload } from '@/types';
import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { z } from 'zod';

const factory = createFactory();
const changeSelfPasswordSchema = z.object({
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
    .min(1, {
      message: 'Password baru harus diisi',
    })
    .max(20, {
      message: 'Password baru tidak valid',
    }),
});

export const changeSelfPasswordHandlers =
  factory.createHandlers(
    // Validator
    validator(
      'json',
      validationFunc(changeSelfPasswordSchema),
    ),

    // Handler
    async (c) => {
      const jwtPayload = c.get('jwtPayload') as JWTPayload;
      const body = c.req.valid('json');

      // Is password correct?
      const user = await kysely
        .selectFrom('User')
        .select(['id', 'password'])
        .where('id', '=', jwtPayload.userId)
        .where('businessId', '=', jwtPayload.businessId)
        .executeTakeFirstOrThrow();

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
          .where('id', '=', jwtPayload.userId)
          .where('businessId', '=', jwtPayload.businessId)
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
