import { PrismaClient } from '@prisma/client';
import type { UserPermission } from '../src/types';

type AllPresent<T extends string> = { [K in T]: number };

const prisma = new PrismaClient();

try {
  console.info('Inserting initial data...');
  const date = new Date();

  await prisma.$transaction(
    async (trx) => {
      // Create business
      const business = await trx.business.upsert({
        select: {
          id: true,
        },
        where: {
          id: 1,
        },
        create: {
          id: 1,
          isActive: true,
          name: 'Notaris 123',
          address: null,
          createdAt: date,
          updatedAt: date,
        },
        update: {},
      });

      // Create user
      const user = await trx.user.upsert({
        select: {
          id: true,
          username: true,
        },
        where: {
          id: 1,
        },
        create: {
          id: 1,
          isActive: true,
          email: 'admin@example.com',
          username: 'admin',
          password: await Bun.password.hash('987654321', {
            algorithm: 'argon2id',
            memoryCost: 65536,
            timeCost: 3,
          }),
          firstName: 'Admin',
          createdAt: date,
          updatedAt: date,
          businessId: business.id,
        },
        update: {},
      });

      // Permissions
      const permissionData: AllPresent<UserPermission> = {
        admin: 1,
        // user
        'user:create': 2,
        'user:read': 3,
        'user:update': 4,
        'user:delete': 5,
      };

      // Create permission
      await trx.permission.createMany({
        data: [
          ...Object.entries(permissionData).map((key) => ({
            id: key[1],
            name: key[0],
          })),
        ],
        skipDuplicates: true,
      });

      // Delete permission that not exist in permissionData
      const permissionNames = Object.keys(permissionData);
      await trx.permission.deleteMany({
        where: {
          name: {
            notIn: permissionNames,
          },
        },
      });

      // Create role
      const role = await trx.role.upsert({
        select: {
          id: true,
        },
        where: {
          name_businessId: {
            name: 'Admin',
            businessId: business.id,
          },
        },
        create: {
          id: 1,
          businessId: business.id,
          name: 'Admin',
          createdAt: date,
          updatedAt: date,
        },
        update: {},
      });

      // Assign permission to role
      await trx.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permissionData.admin,
          },
        },
        create: {
          roleId: role.id,
          permissionId: permissionData.admin,
        },
        update: {},
      });

      // Assign role to user
      await trx.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id,
          },
        },
        create: {
          userId: user.id,
          roleId: role.id,
        },
        update: {},
      });
    },
    {
      timeout: 600000, // 10 minutes
    },
  );

  console.info('Initial data inserted successfully');
} catch (error) {
  console.error(error);
} finally {
  await prisma.$disconnect();
}
