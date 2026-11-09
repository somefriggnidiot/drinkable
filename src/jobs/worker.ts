import nodemailer from "nodemailer";
import { jobs } from "./queue";
import { pool } from "@/db";
import { processMedia } from "@/domain/media";
import { logger } from "@/lib/errors";

const boss = await jobs();
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mailpit",
  port: Number(process.env.SMTP_PORT || 1025),
  secure: process.env.SMTP_SECURE === "true",
  ...(process.env.SMTP_USER
    ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }
    : {}),
});
await boss.work<{ to: string; subject: string; text: string }>(
  "email",
  async ([job]) => {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || "Drinkable City <hello@drinkable.city>",
      ...job.data,
    });
    logger.info({ jobId: job.id }, "Email delivered");
  },
);
await boss.work<{ id: string }>("media", async ([job]) => {
  await processMedia(job.data.id);
  logger.info({ jobId: job.id }, "Image processed");
});
await boss.work("maintenance", async () => {
  await pool.query(
    "DELETE FROM rate_limit WHERE reset_at<now()-interval '1 day'",
  );
  await pool.query(
    "DELETE FROM auth_verification WHERE expires_at<now()-interval '1 day'",
  );
  await pool.query(
    "DELETE FROM auth_session WHERE expires_at<now()-interval '1 day'",
  );
});
await boss.schedule("maintenance", "0 3 * * *");
const beat = async () => {
  await pool.query(
    "INSERT INTO worker_heartbeat(id,touched_at) VALUES(1,now()) ON CONFLICT(id) DO UPDATE SET touched_at=now()",
  );
};
await beat();
const timer = setInterval(() => {
  void beat().catch((err) => logger.error({ err }, "Heartbeat failed"));
}, 30000);
async function stop() {
  clearInterval(timer);
  await boss.stop();
  await pool.end();
  process.exit(0);
}
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());
logger.info("Drinkable worker ready");
