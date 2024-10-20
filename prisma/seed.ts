import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const date = new Date();
  const businessId = 1;

  // Create business
  await prisma.business.upsert({
    where: {
      businessId: businessId,
    },
    create: {
      businessId: businessId,
      isActive: true,
      name: 'Bisnis Abc',
      address: 'Jl. Abc',
      createdAt: date,
      updatedAt: date,
    },
    update: {
      isActive: true,
      name: 'Bisnis Abc',
      address: 'Jl. Abc',
      createdAt: date,
      updatedAt: date,
    },
  });

  // Create user
  await prisma.user.upsert({
    where: {
      userId: 1,
    },
    create: {
      isActive: true,
      username: 'admin',
      password: await Bun.password.hash('admin', {
        algorithm: 'argon2id',
        memoryCost: 65536,
        timeCost: 3,
      }),
      firstName: 'Admin',
      createdAt: date,
      updatedAt: date,
      businessId: businessId,
    },
    update: {
      isActive: true,
      username: 'admin',
      password: await Bun.password.hash('admin', {
        algorithm: 'argon2id',
        memoryCost: 65536,
        timeCost: 3,
      }),
      firstName: 'Admin',
      createdAt: date,
      updatedAt: date,
      businessId: businessId,
    },
  });

  await prisma.$disconnect();
} catch (error) {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
}
