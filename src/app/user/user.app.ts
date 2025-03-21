import { Hono } from 'hono';
import { changePasswordHandlers } from './handler/change-password';
import { changeSelfPasswordHandlers } from './handler/change-self-password';
import { createUserHandlers } from './handler/create-user';
import { deleteUserHandlers } from './handler/delete-user';
import { getCurrentUserHandlers } from './handler/get-current-user';
import { getTokenHandlers } from './handler/get-token';
import { getUserDetailHandlers } from './handler/get-user-detail';
import { getUsersHandlers } from './handler/get-users';
import { loginHandlers } from './handler/login';
import { updateUserHandlers } from './handler/update-user';

export const userApp = new Hono()
  .post('/login', ...loginHandlers)
  .get('/token', ...getTokenHandlers)
  .get('/user', ...getCurrentUserHandlers)
  .put('/user/password', ...changeSelfPasswordHandlers)
  .get('/users', ...getUsersHandlers)
  .get('/users/:id', ...getUserDetailHandlers)
  .post('/users', ...createUserHandlers)
  .put('/users/:id', ...updateUserHandlers)
  .put('/users/:id/password', ...changePasswordHandlers)
  .delete('/users/:id', ...deleteUserHandlers);
