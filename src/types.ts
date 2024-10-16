export type JWTPayload = {
  exp: number;
  nbf?: number;
  iat?: number;
  business_id: number;
  user_id: number;
};
