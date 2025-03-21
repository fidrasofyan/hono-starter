import { kysely } from '@/database';
import { escapeHTML, validationFunc } from '@/lib/common';
import { userCan } from '@/middleware';
import { logActivity } from '@/service/logger';
import { websocketEmitToUser } from '@/service/websocket';
import type { JWTPayload } from '@/types';
import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { z } from 'zod';

const factory = createFactory();
const updateRoleParamSchema = z.object({
  id: z.number({
    coerce: true,
    message: 'Hak akses tidak valid',
  }),
});
const updateRoleBodySchema = z.object({
  name: z
    .string({
      message: 'Nama tidak valid',
    })
    .min(1, {
      message: 'Nama harus diisi',
    })
    .max(50, {
      message: 'Nama maksimal 50 karakter',
    }),
  description: z
    .string({
      message: 'Deskripsi tidak valid',
    })
    .max(100, {
      message: 'Deskripsi maksimal 100 karakter',
    })
    .optional(),
  permissionIds: z
    .array(
      z
        .number({
          coerce: true,
          message: 'Hak akses tidak valid',
        })
        .min(1, {
          message: 'Hak akses tidak valid',
        }),
      {
        message: 'Hak akses harus dalam array',
      },
    )
    .nonempty({
      message: 'Hak akses harus dipilih minimal 1',
    }),
});

export const updateRoleHandlers = factory.createHandlers(
  // Authorization
  userCan('user:update'),

  // Validator
  validator('param', validationFunc(updateRoleParamSchema)),
  validator('json', validationFunc(updateRoleBodySchema)),

  // Handler
  async (c) => {
    const jwtPayload = c.get('jwtPayload') as JWTPayload;
    const param = c.req.valid('param');
    const body = c.req.valid('json');

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
      const date = new Date();

      // Update role
      await trx
        .updateTable('Role')
        .set({
          name: escapeHTML(body.name),
          description: body.description
            ? escapeHTML(body.description)
            : null,
          updatedAt: date,
        })
        .where('id', '=', role.id)
        .where('businessId', '=', jwtPayload.businessId)
        .execute();

      // Update role permission
      await trx
        .deleteFrom('RolePermission')
        .where('roleId', '=', role.id)
        .execute();

      await trx
        .insertInto('RolePermission')
        .values(
          body.permissionIds.map((id) => ({
            roleId: role.id,
            permissionId: id,
          })),
        )
        .execute();

      // Log activity
      await logActivity({
        businessId: jwtPayload.businessId,
        userId: jwtPayload.userId,
        action: 'role:update',
        status: 'success',
        context: {
          id: role.id,
        },
      });
    });

    websocketEmitToUser({
      userId: jwtPayload.userId,
      event: 'role:updated',
      payload: { id: role.id },
    });

    return c.json(
      {
        message: 'Hak akses diperbarui',
      },
      200,
    );
  },
);
