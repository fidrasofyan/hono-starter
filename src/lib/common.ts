import { validator } from 'hono/validator';
import type { z } from 'zod';

export function appValidator<T>(
  target:
    | 'cookie'
    | 'form'
    | 'header'
    | 'json'
    | 'param'
    | 'query',
  schema: z.ZodSchema<T>,
) {
  return validator(target, (value, c) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      return c.json(
        {
          message: parsed.error.errors[0].message,
        },
        400,
      );
    }
    return parsed.data;
  });
}

export function escapeHTML(
  value: string | object | number | boolean,
): string {
  return Bun.escapeHTML(value);
}
