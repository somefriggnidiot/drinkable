import { createHash } from "node:crypto";
import { pool } from "@/db";
import { AppError } from "./errors";

export async function rateLimit(
  request: Request,
  namespace: string,
  memberId?: string,
  max = 20,
) {
  const identity = memberId || request.headers.get("x-real-ip") || "local";
  const key = createHash("sha256")
    .update(`${namespace}:${identity}`)
    .digest("hex");
  const { rows } = await pool.query(
    `INSERT INTO rate_limit(key,hits,reset_at) VALUES($1,1,now()+interval '10 minutes')
    ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limit.reset_at<now() THEN 1 ELSE rate_limit.hits+1 END,
    reset_at=CASE WHEN rate_limit.reset_at<now() THEN now()+interval '10 minutes' ELSE rate_limit.reset_at END RETURNING hits`,
    [key],
  );
  if (rows[0].hits > max)
    throw new AppError(
      429,
      "Too many requests. Please try again in a few minutes.",
    );
}
