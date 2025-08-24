import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { z } from 'zod';
import { kysely } from '@/database';
import { escapeHTML, validationFunc } from '@/lib/common';
import { userCan } from '@/middleware';
import { logActivity } from '@/service/logger';
import { websocketEmitToUser } from '@/service/websocket';
import type { JWTPayload } from '@/types';

const factory = createFactory();
const createRoleSchema = z.object({
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
      z.coerce
        .number({
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

export const createRoleHandlers = factory.createHandlers(
  // Authorization
  userCan('user:create'),

  // Validator
  validator('json', validationFunc(createRoleSchema)),

  // Handler
  async (c) => {
    const jwtPayload = c.get('jwtPayload') as JWTPayload;
    const body = c.req.valid('json');

    // Limit
    const count = await kysely
      .selectFrom('Role')
      .select(({ fn }) => [
        fn.count('Role.id').$castTo<string>().as('total'),
      ])
      .where('Role.businessId', '=', jwtPayload.businessId)
      .executeTakeFirstOrThrow();

    if (Number.parseInt(count.total, 10) >= 50) {
      return c.json(
        {
          message: 'Hak akses sudah maksimal',
        },
        422,
      );
    }

    // Is role name already exist?
    const isRoleExist = await kysely
      .selectFrom('Role')
      .select(['Role.id'])
      .where('Role.name', '=', body.name)
      .where('Role.businessId', '=', jwtPayload.businessId)
      .executeTakeFirst();

    if (isRoleExist) {
      return c.json(
        {
          message: 'Nama sudah ada',
        },
        422,
      );
    }

    // Is permission ids valid?
    const permissionFound = Number.parseInt(
      (
        await kysely
          .selectFrom('Permission')
          .select(({ fn }) => [
            fn
              .count('Permission.id')
              .$castTo<string>()
              .as('total'),
          ])
          .where('Permission.id', 'in', body.permissionIds)
          .executeTakeFirstOrThrow()
      ).total,
      10,
    );

    if (permissionFound !== body.permissionIds.length) {
      return c.json(
        {
          message: 'Hak akses tidak valid',
        },
        422,
      );
    }

    const date = new Date();

    const result = await kysely
      .transaction()
      .execute(async (trx) => {
        // Create role
        const role = await trx
          .insertInto('Role')
          .values({
            businessId: jwtPayload.businessId,
            name: escapeHTML(body.name),
            description: body.description
              ? escapeHTML(body.description)
              : null,
            createdAt: date,
          })
          .returning(['id'])
          .executeTakeFirstOrThrow();

        // Create role permission
        await trx
          .insertInto('RolePermission')
          .values(
            body.permissionIds.map((id) => ({
              roleId: role.id,
              permissionId: id,
            })),
          )
          .execute();

        await logActivity({
          businessId: jwtPayload.businessId,
          userId: jwtPayload.userId,
          action: 'role:create',
          status: 'success',
          context: {
            id: role.id,
          },
        });

        return role;
      });

    websocketEmitToUser({
      userId: jwtPayload.userId,
      event: 'role:created',
      payload: { roleId: result.id },
    });

    return c.json(
      {
        message: 'Wewenang ditambahkan',
      },
      200,
    );
  },
);
