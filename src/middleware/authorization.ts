import { kysely } from '@/database';
import type { JWTPayload, UserPermission } from '@/types';
import { createMiddleware } from 'hono/factory';

export function userCan(permission: UserPermission) {
  return createMiddleware(async (c, next) => {
    const jwtPayload = c.get('jwtPayload') as JWTPayload;

    const roleIds: number[] = (
      await kysely
        .selectFrom('UserRole')
        .select(['UserRole.roleId'])
        .where('UserRole.userId', '=', jwtPayload.userId)
        .execute()
    ).map((role) => role.roleId);

    if (roleIds.length === 0) {
      return c.json(
        {
          message: 'Access forbidden',
        },
        403,
      );
    }

    const permissions: string[] = (
      await kysely
        .selectFrom('Permission')
        .innerJoin(
          'RolePermission',
          'RolePermission.permissionId',
          'Permission.id',
        )
        .select(['Permission.id', 'Permission.name'])
        .where('RolePermission.roleId', 'in', roleIds)
        .distinctOn('Permission.name')
        .execute()
    ).map((permission) => permission.name);

    // Is admin?
    if (permissions.includes('admin')) {
      return await next();
    }

    // Check permission
    if (permissions.includes(permission)) {
      return await next();
    }

    return c.json(
      {
        message: 'Access forbidden',
      },
      403,
    );
  });
}
