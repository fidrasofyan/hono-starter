import { Hono } from 'hono';
import { getTokenHandlers } from './handlers/get-token';
import { getUserInfoHandlers } from './handlers/get-user-info';
import { loginHandlers } from './handlers/login';

const userApp = new Hono();

userApp.post('/login', ...loginHandlers);
userApp.get('/token', ...getTokenHandlers);
userApp.get('/user', ...getUserInfoHandlers);

export { userApp };
