import { showRoutes } from 'hono/dev';
import { app } from '../src/app';
import { kysely } from '../src/database';

showRoutes(app, {
  verbose: true,
  colorize: true,
});

await kysely.destroy();
