import { kysely } from '@/database';
import { validationFunc } from '@/lib/common';
import { userCan } from '@/middleware';
import type { JWTPayload } from '@/types';
import { createFactory } from 'hono/factory';
import { validator } from 'hono/validator';
import { jsonArrayFrom } from 'kysely/helpers/postgres';
import { z } from 'zod';

const factory = createFactory();
const getUsersSchema = z.object({
  page: z.number({
    coerce: true,
    message: 'Halaman tidak valid',
  }),
  limit: z
    .number({
      coerce: true,
      message: 'Limit tidak valid',
    })
    .max(1000, {
      message: 'Limit tidak valid',
    }),
  query: z.string().optional(),
});

export const getUsersHandlers = factory.createHandlers(
  // Authorization
  userCan('user:read'),

  // Validator
  validator('query', validationFunc(getUsersSchema)),

  // Handler
  async (c) => {
    const jwtPayload = c.get('jwtPayload') as JWTPayload;
    const query = c.req.valid('query');

    let countQuery = kysely
      .selectFrom('User')
      .select(({ fn }) => [
        fn
          .count('id')
          .distinct()
          .$castTo<string>()
          .as('total'),
      ])
      .where('businessId', '=', jwtPayload.businessId);

    if (query.query) {
      countQuery = countQuery.where((eb) =>
        eb.or([
          eb('User.email', 'like', `%${query.query}%`),
          eb('User.username', 'like', `%${query.query}%`),
          eb('User.firstName', 'like', `%${query.query}%`),
          eb('User.lastName', 'like', `%${query.query}%`),
        ]),
      );
    }

    const totalData = (
      await countQuery.executeTakeFirstOrThrow()
    ).total;

    let totalPage = Math.ceil(
      Number.parseInt(totalData) / query.limit,
    );
    if (totalPage === 0) totalPage = 1;

    if (query.page > totalPage) {
      return c.json(
        {
          message: 'Halaman tidak ditemukan',
        },
        400,
      );
    }

    let getUsersQuery = kysely
      .selectFrom('User')
      .select(({ eb }) => [
        'User.id',
        'User.isActive',
        'User.firstName',
        'User.lastName',
        'User.email',
        'User.username',
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
      .where('businessId', '=', jwtPayload.businessId);

    if (query.query) {
      getUsersQuery = getUsersQuery.where((eb) =>
        eb.or([
          eb('User.email', 'like', `%${query.query}%`),
          eb('User.username', 'like', `%${query.query}%`),
          eb('User.firstName', 'like', `%${query.query}%`),
          eb('User.lastName', 'like', `%${query.query}%`),
        ]),
      );
    }

    return c.json(
      {
        totalData: Number.parseInt(totalData),
        totalPage: totalPage,
        page: query.page,
        limit: query.limit,
        query: query.query || null,
        data: await getUsersQuery
          .offset(query.limit * (query.page - 1))
          .limit(query.limit)
          .orderBy('User.createdAt desc')
          .execute(),
      },
      200,
    );
  },
);
