import { createFactory } from 'hono/factory';
import { kysely } from '../../../database';
import type { JWTPayload } from '../../../types';

const factory = createFactory();

export const getUserInfoHandlers = factory.createHandlers(
	// Handler
	async (c) => {
		const jwtPayload = c.var.jwtPayload as JWTPayload;

		const user = await kysely
			.selectFrom('user')
			.select(['username', 'created_at'])
			.where('id', '=', jwtPayload.userId)
			.executeTakeFirst();

		return c.json(
			{
				data: user,
			},
			200,
		);
	},
);
