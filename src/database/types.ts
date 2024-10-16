import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type business = {
    business_id: Generated<number>;
    is_active: boolean;
    name: string;
    address: string;
    created_at: Timestamp;
    updated_at: Timestamp | null;
};
export type permission = {
    permission_id: Generated<number>;
    name: string;
    created_at: Timestamp;
    updated_at: Timestamp | null;
};
export type role = {
    role_id: Generated<number>;
    name: string;
    created_at: Timestamp;
    updated_at: Timestamp | null;
};
export type role_permission = {
    role_id: number;
    permission_id: number;
    created_at: Timestamp;
};
export type user = {
    user_id: Generated<number>;
    is_active: boolean;
    username: string;
    password: string;
    first_name: string;
    last_name: string | null;
    created_at: Timestamp;
    updated_at: Timestamp | null;
    business_id: number;
};
export type user_role = {
    user_id: number;
    role_id: number;
    created_at: Timestamp;
};
export type DB = {
    business: business;
    permission: permission;
    role: role;
    role_permission: role_permission;
    user: user;
    user_role: user_role;
};
