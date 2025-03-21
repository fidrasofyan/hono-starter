export async function storeFile(
  destination: string,
  input: File,
): Promise<number> {
  return await Bun.write(`storage/${destination}`, input);
}
