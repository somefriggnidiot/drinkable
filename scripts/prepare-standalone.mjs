import { cp, mkdir, readdir, rm } from "node:fs/promises";
await mkdir(".next/standalone/.next", { recursive: true });
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
await cp("public", ".next/standalone/public", { recursive: true });
// Next may copy loaded dotenv files independently of tracing exclusions.
// Deployment settings must be injected at runtime, never packaged in the image.
for (const entry of await readdir(".next/standalone", {
  withFileTypes: true,
})) {
  if (entry.isFile() && entry.name.startsWith(".env"))
    await rm(`.next/standalone/${entry.name}`);
}
