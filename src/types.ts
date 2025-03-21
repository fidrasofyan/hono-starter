export type BunServer = {
  upgrade<T>(
    req: Request,
    options?: {
      data: T;
    },
  ): boolean;
};

export type BunWebSocketData = {
  token: string | undefined;
};

export type JWTPayload = {
  exp: number;
  nbf?: number;
  iat?: number;
  businessId: number;
  userId: number;
};

export type UserPermission =
  | 'admin'
  // user
  | 'user:create'
  | 'user:read'
  | 'user:update'
  | 'user:delete';
