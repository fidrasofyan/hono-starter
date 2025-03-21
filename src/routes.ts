import { Hono } from 'hono';
import { roleApp } from './app/role/role.app';
import { userApp } from './app/user/user.app';
import { authenticationMiddleware } from './middleware';

export const routes = new Hono()
  // Prefix
  .basePath('/api/v1')
  // Middleware
  .use(authenticationMiddleware)
  // Apps
  .route('/', roleApp)
  .route('/', userApp);
