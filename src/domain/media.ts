import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { pool } from "@/db";
import { jobs } from "@/jobs/queue";
import { AppError } from "@/lib/errors";
import type { Member } from "./types";
import { bodyBytes } from "@/lib/body";

// This directory is a runtime Docker volume, never an application build input.
export const mediaRoot = () =>
  resolve(/* turbopackIgnore: true */ process.env.MEDIA_ROOT || "data/media");
export async function uploadMedia(request: Request, member: Member) {
  const bytes = await bodyBytes(request, 11 * 1024 * 1024);
  const form = await new Response(bytes.buffer as ArrayBuffer, {
    headers: { "content-type": request.headers.get("content-type") || "" },
  }).formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0)
    throw new AppError(400, "Choose a photo to upload.");
  if (file.size > 10 * 1024 * 1024)
    throw new AppError(413, "Photos must be 10 MB or smaller.");
  const buffer = Buffer.from(await file.arrayBuffer());
  let metadata: Metadata;
  try {
    metadata = await sharp(buffer, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new AppError(400, "Choose a valid JPEG, PNG, or WebP image.");
  }
  if (
    !["jpeg", "png", "webp"].includes(metadata.format || "") ||
    (metadata.pages || 1) > 1
  )
    throw new AppError(400, "Choose a still JPEG, PNG, or WebP image.");
  const id = randomUUID();
  const dir = join(/* turbopackIgnore: true */ mediaRoot(), id);
  await mkdir(dir, { recursive: true });
  try {
    await writeFile(join(dir, "source"), buffer, { mode: 0o600 });
    await pool.query(
      "INSERT INTO media(id,user_id,filename,alt) VALUES($1,$2,$3,$4)",
      [
        id,
        member.id,
        file.name.slice(0, 250),
        String(form.get("alt") || "").slice(0, 500),
      ],
    );
    await (await jobs()).send("media", { id });
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    await pool.query("UPDATE media SET status='failed' WHERE id=$1", [id]);
    throw error;
  }
  return { id, status: "processing" };
}
export async function processMedia(id: string) {
  const dir = join(/* turbopackIgnore: true */ mediaRoot(), id);
  try {
    await sharp(join(dir, "source"), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({
        width: 1920,
        height: 1920,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(join(dir, "image.webp"));
    await sharp(join(dir, "source"), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(600, 400, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(join(dir, "thumb.webp"));
    await pool.query("UPDATE media SET status='ready' WHERE id=$1", [id]);
    await rm(join(dir, "source"), { force: true });
  } catch (error) {
    await pool.query("UPDATE media SET status='failed' WHERE id=$1", [id]);
    throw error;
  }
}
export async function serveMedia(id: string, filename: string) {
  if (
    !/^[0-9a-f-]{36}$/.test(id) ||
    !["image.webp", "thumb.webp"].includes(filename)
  )
    throw new AppError(404, "Image not found.");
  const result = await pool.query(
    "SELECT 1 FROM media WHERE id=$1 AND status='ready'",
    [id],
  );
  if (!result.rowCount) throw new AppError(404, "Image not found.");
  try {
    return new Response(
      await readFile(
        /* turbopackIgnore: true */ join(
          /* turbopackIgnore: true */ mediaRoot(),
          id,
          filename,
        ),
      ),
      {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public,max-age=31536000,immutable",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    throw new AppError(404, "Image not found.");
  }
}
