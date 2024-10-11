import { Hono } from 'hono';
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
  // biome-ignore lint/suspicious/noConsole: <explanation>
  console.error(err);
  return c.json(
    {
      message: 'Internal server error',
    },
    500,
  );
});

export { app };
