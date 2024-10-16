import { Hono } from 'hono';
import { getTokenHandlers } from './handlers/get-token';
import { getUserInfoHandlers } from './handlers/get-user-info';
import { loginHandlers } from './handlers/login';

export const userApp = new Hono()
  .post('/login', ...loginHandlers)
  .get('/token', ...getTokenHandlers)
  .get('/user', ...getUserInfoHandlers);
