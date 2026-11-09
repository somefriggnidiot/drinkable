import { ZodError } from "zod";
import pino from "pino";
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: ["password", "token", "headers.authorization", "headers.cookie"],
});
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function errorResponse(error: unknown): Response {
  if (error instanceof ZodError)
    return Response.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".") || "Input"}: ${i.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  if (error instanceof AppError)
    return Response.json({ error: error.message }, { status: error.status });
  const code = (error as { code?: string })?.code;
  if (code === "23505")
    return Response.json(
      { error: "This record already exists. Refresh the page and try again." },
      { status: 409 },
    );
  if (code === "23503")
    return Response.json(
      { error: "That record is still in use or no longer exists." },
      { status: 409 },
    );
  logger.error({ err: error }, "Request failed");
  return Response.json(
    { error: "We couldn’t complete your request. Please try again." },
    { status: 500 },
  );
}
