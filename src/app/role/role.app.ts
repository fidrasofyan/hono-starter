import { Hono } from 'hono';
import { createRoleHandlers } from './handler/create-role';
import { deleteRoleHandlers } from './handler/delete-role';
import { getPermissionsHandlers } from './handler/get-permissions';
import { getRoleDetailHandlers } from './handler/get-role-detail';
import { getRolesHandlers } from './handler/get-roles';
import { updateRoleHandlers } from './handler/update-role';

export const roleApp = new Hono()
  // Permission
  .get('/permissions', ...getPermissionsHandlers)
  // Role
  .get('/roles', ...getRolesHandlers)
  .get('/roles/:id', ...getRoleDetailHandlers)
  .post('/roles', ...createRoleHandlers)
  .put('/roles/:id', ...updateRoleHandlers)
  .delete('/roles/:id', ...deleteRoleHandlers);
