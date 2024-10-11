import { sign, verify } from 'hono/jwt';
import type { JWTPayload } from '../types';

export async function generateJWT(
  payload: JWTPayload,
  secret: string,
): Promise<string> {
  return await sign(payload, secret);
}

export async function verifyJWT(
  token: string,
  secret: string,
): Promise<JWTPayload> {
  return (await verify(token, secret)) as JWTPayload;
}
