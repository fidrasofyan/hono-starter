import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import config from './config';
import { routes } from './routes';

const app = new Hono();

// Middleware
if (config.NODE_ENV === 'development') {
  app.use(logger());
}

// Route
app.route('/', routes);

// Not found
app.notFound((c) => {
  return c.json(
    {
      message: 'Route not found',
    },
    404,
  );
});

// Error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        message: 'Invalid request',
      },
      400,
    );
  }

  console.error(err);
  return c.json(
    {
      message: 'Internal server error',
    },
    500,
  );
});

export { app };
