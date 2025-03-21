import { kysely } from '@/database';
import type { JWTPayload } from '@/types';
import { createFactory } from 'hono/factory';
import { jsonArrayFrom } from 'kysely/helpers/postgres';

const factory = createFactory();

export const getCurrentUserHandlers =
  factory.createHandlers(
    // Handler
    async (c) => {
      const jwtPayload = c.get('jwtPayload') as JWTPayload;

      const user = await kysely
        .selectFrom('User')
        .select(({ eb }) => [
          'User.id',
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
        .where('User.id', '=', jwtPayload.userId)
        .where(
          'User.businessId',
          '=',
          jwtPayload.businessId,
        )
        .executeTakeFirst();

      if (!user) throw new Error('User not found');

      let permissions: string[] = [];

      if (user.roles.length > 0) {
        permissions = (
          await kysely
            .selectFrom('Permission')
            .innerJoin(
              'RolePermission',
              'RolePermission.permissionId',
              'Permission.id',
            )
            .select(['Permission.id', 'Permission.name'])
            .where(
              'RolePermission.roleId',
              'in',
              user.roles.map((role) => role.id),
            )
            .distinctOn('Permission.name')
            .execute()
        ).map((permission) => permission.name);
      }

      return c.json(
        {
          data: {
            ...user,
            permissions,
          },
        },
        200,
      );
    },
  );
