import type { z } from 'zod';

export function validationFunc<T>(schema: z.ZodSchema<T>) {
  return (value: any, c: any): T => {
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
  };
}

export function escapeHTML(
  value: string | object | number | boolean,
): string {
  return Bun.escapeHTML(value).trim();
}
