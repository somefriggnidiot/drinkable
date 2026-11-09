import { AppError } from "./errors";
export async function bodyBytes(
  request: Request,
  max = 256 * 1024,
): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length") || 0) > max)
    throw new AppError(413, "This upload is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "A request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new AppError(413, "This upload is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return bytes;
}
export async function readJson(request: Request): Promise<unknown> {
  try {
    return JSON.parse(new TextDecoder().decode(await bodyBytes(request)));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, "Send valid JSON.");
  }
}
