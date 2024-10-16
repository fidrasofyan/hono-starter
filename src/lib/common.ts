export function escapeHTML(
  value: string | object | number | boolean,
): string {
  return Bun.escapeHTML(value);
}
