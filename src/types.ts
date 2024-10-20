export type BunServer = {
  upgrade<T>(
    req: Request,
    options?: {
      data: T;
    },
  ): boolean;
};

export type BunWebSocketData = {
  refreshToken: string | undefined;
};

export type JWTPayload = {
  exp: number;
  nbf?: number;
  iat?: number;
  businessId: number;
  userId: number;
};
