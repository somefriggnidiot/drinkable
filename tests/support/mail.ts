import { readdir, readFile } from "node:fs/promises";
export async function findLocalMailLink(
  email: string,
  kind: "verify" | "reset",
): Promise<string | null> {
  const folder = process.env.TEST_INBOX_DIR;
  if (!folder) return null;
  for (const file of (await readdir(folder)).reverse()) {
    const raw = await readFile(`${folder}/${file}`, "utf8");
    if (!raw.includes(email)) continue;
    const text = raw
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9a-f]{2})/gi, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16)),
      );
    const links = text.match(/https?:\/\/[^\s<>]+/g) || [];
    const match = links.find((link) =>
      kind === "verify"
        ? link.includes("/verify-email?")
        : link.includes("/reset-password/"),
    );
    if (match) return match;
  }
  return null;
}
