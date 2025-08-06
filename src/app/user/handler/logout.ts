import { deleteCookie } from 'hono/cookie';
import { createFactory } from 'hono/factory';

const factory = createFactory();

export const logoutHandlers = factory.createHandlers(
  // Handler
  async (c) => {
    deleteCookie(c, 'token');
    deleteCookie(c, 'refreshToken', {
      path: '/api/v1/token',
    });

    return c.json(
      {
        message: 'Logout berhasil',
      },
      200,
    );
  },
);
