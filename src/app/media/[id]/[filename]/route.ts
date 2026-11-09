import { serveMedia } from "@/domain/media";
import { errorResponse } from "@/lib/errors";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; filename: string }> },
) {
  try {
    const { id, filename } = await context.params;
    return await serveMedia(id, filename);
  } catch (error) {
    return errorResponse(error);
  }
}
