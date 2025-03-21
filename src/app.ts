import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import config from './config';
import { loggerMiddleware } from './middleware';
import { routes } from './routes';
import type { BunServer, BunWebSocketData } from './types';

const app = new Hono();

// Logger
if (config.NODE_ENV === 'development') {
  app.use(loggerMiddleware);
}

// Body limit
app.use(
  bodyLimit({
    maxSize: 100 * 1024 * 1024, // 100 MB
    onError: (c) => {
      return c.json(
        {
          message: 'Request too large',
        },
        413,
      );
    },
  }),
);

// CORS
app.use(
  cors({
    origin: config.CORS_ALLOWED_ORIGINS,
  }),
);

// App routes
app.route('/', routes);

//// Websocket upgrade
app.get('/socket', async (c, next) => {
  const server = (
    'server' in (c.env as any)
      ? (c.env as any).server
      : c.env
  ) as BunServer | undefined;

  if (!server) {
    throw new Error('Server not found');
  }

  const websocketProtocols = c.req.header(
    'Sec-WebSocket-Protocol',
  );

  if (
    !websocketProtocols ||
    !websocketProtocols.includes('jwt')
  ) {
    return await next();
  }

  const upgradeResult = server.upgrade<BunWebSocketData>(
    c.req.raw,
    {
      data: {
        token: websocketProtocols.split(',')[1].trim(),
      },
    },
  );

  if (upgradeResult) {
    return new Response(null);
  }

  await next(); // Failed
});

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
