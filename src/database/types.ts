import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type business = {
    businessId: Generated<number>;
    isActive: boolean;
    name: string;
    address: string | null;
    createdAt: Timestamp;
    updatedAt: Timestamp | null;
};
export type permission = {
    permissionId: Generated<number>;
    name: string;
    createdAt: Timestamp;
    updatedAt: Timestamp | null;
};
export type role = {
    roleId: Generated<number>;
    name: string;
    description: string | null;
    createdAt: Timestamp;
    updatedAt: Timestamp | null;
    businessId: number;
};
export type role_permission = {
    roleId: number;
    permissionId: number;
    createdAt: Timestamp;
};
export type user = {
    userId: Generated<number>;
    isActive: boolean;
    email: string | null;
    username: string;
    password: string;
    firstName: string;
    lastName: string | null;
    createdAt: Timestamp;
    updatedAt: Timestamp | null;
    businessId: number;
};
export type user_role = {
    userId: number;
    roleId: number;
    createdAt: Timestamp;
};
export type DB = {
    business: business;
    permission: permission;
    role: role;
    role_permission: role_permission;
    user: user;
    user_role: user_role;
};
