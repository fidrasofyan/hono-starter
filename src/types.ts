export type JWTPayload = {
	exp: number;
	nbf?: number;
	iat?: number;
	userId: number;
};
