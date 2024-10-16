import { Hono } from 'hono';
import { userApp } from './app/user/user.app';
import { authMiddleware } from './middleware';

const routes = new Hono().basePath('/api/v1');

// Middleware
routes.use(authMiddleware);

// Routes
routes.route('/', userApp);

export { routes };
