import { showRoutes } from 'hono/dev';
import { app } from '../src/app';

showRoutes(app, {
  verbose: true,
  colorize: true,
});
