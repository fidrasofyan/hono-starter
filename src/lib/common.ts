import type { z } from 'zod';

export function validationFunc<T>(schema: z.Schema<T>) {
  return (value: any, c: any): T => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      return c.json(
        {
          message: parsed.error.issues[0].message,
        },
        422,
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
