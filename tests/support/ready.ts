import { expect } from "@playwright/test";
export default async function ready() {
  const base = process.env.TEST_BASE_URL || "http://localhost:3000";
  await expect
    .poll(
      async () => {
        try {
          const response = await fetch(`${base}/api/health`, {
            signal: AbortSignal.timeout(3000),
          });
          return response.ok && (await response.json()).worker === "ok";
        } catch {
          return false;
        }
      },
      { timeout: 60000, intervals: [200, 500, 1000] },
    )
    .toBe(true);
}
