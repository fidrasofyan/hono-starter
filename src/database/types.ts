import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type ActivityLog = {
    id: Generated<number>;
    businessId: number;
    userId: number;
    action: string;
    status: string;
    message: string | null;
    context: unknown | null;
    createdAt: Timestamp;
    updatedAt: Timestamp | null;
};
export type Business = {
    id: Generated<number>;
    isActive: boolean;
    name: string;
    address: string | null;
    createdAt: Timestamp;
    updatedAt: Timestamp | null;
};
export type Permission = {
    id: Generated<number>;
    name: string;
};
export type Role = {
    id: Generated<number>;
    name: string;
    description: string | null;
    createdAt: Timestamp;
    updatedAt: Timestamp | null;
    businessId: number;
};
export type RolePermission = {
    roleId: number;
    permissionId: number;
};
export type User = {
    id: Generated<number>;
    businessId: number;
    isActive: boolean;
    email: string;
    username: string | null;
    password: string | null;
    firstName: string;
    lastName: string | null;
    createdBy: number | null;
    createdAt: Timestamp;
    updatedBy: number | null;
    updatedAt: Timestamp | null;
};
export type UserRole = {
    userId: number;
    roleId: number;
};
export type DB = {
    ActivityLog: ActivityLog;
    Business: Business;
    Permission: Permission;
    Role: Role;
    RolePermission: RolePermission;
    User: User;
    UserRole: UserRole;
};
