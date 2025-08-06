import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { z } from 'zod';
import { kysely } from '@/database';
import { escapeHTML, validationFunc } from '@/lib/common';
import { hashPassword } from '@/lib/hashing';
import { userCan } from '@/middleware';
import { logActivity } from '@/service/logger';
import { websocketEmitToUser } from '@/service/websocket';
import type { JWTPayload } from '@/types';

const factory = createFactory();
const createUserSchema = z
  .object({
    name: z
      .string({
        message: 'Nama tidak valid',
      })
      .min(1, {
        message: 'Nama harus diisi',
      }),
    email: z
      .string({
        message: 'Email tidak valid',
      })
      .min(1, {
        message: 'Email harus diisi',
      })
      .email({
        message: 'Email tidak valid',
      }),
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
    password: z
      .string({
        message: 'Password tidak valid',
      })
      .min(8, {
        message: 'Password minimal 8 karakter',
      })
      .max(20, {
        message: 'Password maksimal 20 karakter',
      })
      .optional(),
    roleIds: z
      .array(
        z.coerce
          .number({
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
      }),
  })
  .superRefine((data, ctx) => {
    if (data.username && !data.password) {
      ctx.addIssue({
        code: 'custom',
        message: 'Password harus diisi',
      });
      return z.NEVER;
    }
  });

export const createUserHandlers = factory.createHandlers(
  // Authorization
  userCan('user:create'),

  // Validator
  validator('json', validationFunc(createUserSchema)),

  // Handler
  async (c) => {
    const jwtPayload = c.get('jwtPayload') as JWTPayload;
    const body = c.req.valid('json');

    // Is email unique?
    const isEmailUnique = await kysely
      .selectFrom('User')
      .select(['email'])
      .where('email', '=', body.email)
      .where('businessId', '=', jwtPayload.businessId)
      .executeTakeFirst();

    if (isEmailUnique) {
      return c.json(
        {
          message: 'Email sudah digunakan',
        },
        422,
      );
    }

    // Is username unique?
    if (body.username) {
      const isUsernameUnique = await kysely
        .selectFrom('User')
        .select(['username'])
        .where('username', '=', body.username)
        .where('businessId', '=', jwtPayload.businessId)
        .executeTakeFirst();

      if (isUsernameUnique) {
        return c.json(
          {
            message: 'Username sudah digunakan',
          },
          422,
        );
      }
    }

    // Is role exist?
    const roleFound = await kysely
      .selectFrom('Role')
      .select(['Role.id'])
      .where('Role.id', 'in', body.roleIds)
      .where('Role.businessId', '=', jwtPayload.businessId)
      .execute();

    if (roleFound.length !== body.roleIds.length) {
      return c.json(
        {
          message: 'Wewenang tidak valid',
        },
        422,
      );
    }

    const [firstName, ...lastNameParts] = escapeHTML(
      body.name,
    ).split(' ');
    const lastName = lastNameParts.join(' ');

    const date = new Date();

    const result = await kysely
      .transaction()
      .execute(async (trx) => {
        // Create user
        const user = await trx
          .insertInto('User')
          .values({
            isActive: true,
            email: escapeHTML(body.email),
            username: body.username
              ? escapeHTML(body.username)
              : null,
            firstName: firstName,
            lastName: lastName,
            password: body.password
              ? await hashPassword(body.password)
              : null,
            businessId: jwtPayload.businessId,
            createdBy: jwtPayload.userId,
            createdAt: date,
          })
          .returning(['User.id'])
          .executeTakeFirstOrThrow();

        // Create user role
        await trx
          .insertInto('UserRole')
          .values(
            body.roleIds.map((roleId) => {
              return {
                userId: user.id,
                roleId,
              };
            }),
          )
          .execute();

        await logActivity({
          businessId: jwtPayload.businessId,
          userId: jwtPayload.userId,
          action: 'user:create',
          status: 'success',
          context: {
            id: user.id,
          },
        });

        return user;
      });

    websocketEmitToUser({
      userId: jwtPayload.userId,
      event: 'user:created',
      payload: { id: result.id },
    });

    return c.json(
      {
        message: 'User ditambahkan',
      },
      200,
    );
  },
);
