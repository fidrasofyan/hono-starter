import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const date = new Date();
  const businessId = 1;

  // Create business
  await prisma.business.upsert({
    where: {
      business_id: businessId,
    },
    create: {
      business_id: businessId,
      is_active: true,
      name: 'Bisnis Abc',
      address: 'Jl. Abc',
      created_at: date,
      updated_at: date,
    },
    update: {
      is_active: true,
      name: 'Bisnis Abc',
      address: 'Jl. Abc',
      created_at: date,
      updated_at: date,
    },
  });

  // Create user
  await prisma.user.upsert({
    where: {
      user_id: 1,
    },
    create: {
      is_active: true,
      username: 'admin',
      password: await Bun.password.hash('admin', {
        algorithm: 'argon2id',
        memoryCost: 65536,
        timeCost: 3,
      }),
      first_name: 'Admin',
      created_at: date,
      updated_at: date,
      business_id: businessId,
    },
    update: {
      is_active: true,
      username: 'admin',
      password: await Bun.password.hash('admin', {
        algorithm: 'argon2id',
        memoryCost: 65536,
        timeCost: 3,
      }),
      first_name: 'Admin',
      created_at: date,
      updated_at: date,
      business_id: businessId,
    },
  });

  await prisma.$disconnect();
} catch (error) {
  // biome-ignore lint/suspicious/noConsole: <explanation>
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
}
