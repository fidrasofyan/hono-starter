import { kysely } from '@/database';
import { escapeHTML, validationFunc } from '@/lib/common';
// import { hashPassword } from '@/lib/hashing';
import { userCan } from '@/middleware';
import { logActivity } from '@/service/logger';
import { websocketEmitToUser } from '@/service/websocket';
import type { JWTPayload } from '@/types';
import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { z } from 'zod';

const factory = createFactory();
const updateUserParamSchema = z.object({
  id: z.number({
    coerce: true,
    message: 'ID User tidak valid',
  }),
});
const updateUserBodySchema = z.object({
  name: z
    .string({
      message: 'Nama tidak valid',
    })
    .min(1, {
      message: 'Nama harus diisi',
    })
    .optional(),
  email: z
    .string({
      message: 'Email tidak valid',
    })
    .min(1, {
      message: 'Email harus diisi',
    })
    .email({
      message: 'Email tidak valid',
    })
    .optional(),
  username: z
    .string({
      message: 'Username tidak valid',
    })
    .min(4, {
      message: 'Username minimal 4 karakter',
    })
    .max(20, {
      message: 'Username maksimal 20 karakter',
    })
    .optional(),
  roleIds: z
    .array(
      z
        .number({
          coerce: true,
          message: 'Wewenang harus dipilih',
        })
        .min(1, {
          message: 'Wewenang harus dipilih',
        }),
      {
        message: 'Wewenang harus dipilih',
      },
    )
    .nonempty({
      message: 'Wewenang harus dipilih',
    })
    .optional(),
  isActive: z
    .boolean({
      message: 'Status tidak valid',
    })
    .optional(),
});

export const updateUserHandlers = factory.createHandlers(
  // Authorization
  userCan('user:update'),

  // Validator
  validator('param', validationFunc(updateUserParamSchema)),
  validator('json', validationFunc(updateUserBodySchema)),

  // Handler
  async (c) => {
    const jwtPayload = c.get('jwtPayload') as JWTPayload;
    const param = c.req.valid('param');
    const body = c.req.valid('json');

    // Is user exist?
    const user = await kysely
      .selectFrom('User')
      .select(['id', 'email', 'username'])
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

    // Is email unique?
    if (body.email && body.email !== user.email) {
      const email = await kysely
        .selectFrom('User')
        .select(['email'])
        .where('email', '=', body.email)
        .where('businessId', '=', jwtPayload.businessId)
        .executeTakeFirst();

      if (email) {
        return c.json(
          {
            message: 'Email sudah digunakan',
          },
          422,
        );
      }
    }

    // Is username unique?
    if (body.username && body.username !== user.username) {
      const username = await kysely
        .selectFrom('User')
        .select(['username'])
        .where('username', '=', body.username)
        .where('businessId', '=', jwtPayload.businessId)
        .executeTakeFirst();

      if (username) {
        return c.json(
          {
            message: 'Username sudah digunakan',
          },
          422,
        );
      }
    }

    // Is role exist?
    if (body.roleIds && body.roleIds.length > 0) {
      const roleFound = await kysely
        .selectFrom('Role')
        .select(['Role.id'])
        .where('Role.id', 'in', body.roleIds)
        .where(
          'Role.businessId',
          '=',
          jwtPayload.businessId,
        )
        .execute();

      if (roleFound.length !== body.roleIds.length) {
        return c.json(
          {
            message: 'Wewenang tidak valid',
          },
          422,
        );
      }
    }

    let firstName = null;
    let lastName = null;

    if (body.name) {
      const [firstNamePart, ...lastNameParts] = escapeHTML(
        body.name,
      ).split(' ');

      firstName = firstNamePart;
      lastName = lastNameParts.join(' ');
    }

    const date = new Date();

    await kysely.transaction().execute(async (trx) => {
      // Update user
      await trx
        .updateTable('User')
        .set({
          isActive:
            body.isActive !== undefined
              ? body.isActive
              : undefined,
          email: body.email
            ? escapeHTML(body.email)
            : undefined,
          username: body.username
            ? escapeHTML(body.username)
            : undefined,
          firstName: firstName ? firstName : undefined,
          lastName: lastName ? lastName : undefined,
          updatedAt: date,
          updatedBy: jwtPayload.userId,
        })
        .where('id', '=', user.id)
        .executeTakeFirstOrThrow();

      // Update user role
      if (body.roleIds && body.roleIds.length > 0) {
        await trx
          .deleteFrom('UserRole')
          .where('userId', '=', user.id)
          .execute();

        await trx
          .insertInto('UserRole')
          .values(
            body.roleIds.map((roleId) => ({
              userId: user.id,
              roleId,
            })),
          )
          .execute();

        await logActivity({
          businessId: jwtPayload.businessId,
          userId: jwtPayload.userId,
          action: 'user:update',
          status: 'success',
          context: {
            id: user.id,
          },
        });
      }
    });

    websocketEmitToUser({
      userId: jwtPayload.userId,
      event: 'user:updated',
      payload: { id: user.id },
    });

    return c.json(
      {
        message: 'User diubah',
      },
      200,
    );
  },
);
