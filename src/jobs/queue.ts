import { PgBoss } from "pg-boss";

let bossPromise: Promise<PgBoss> | undefined;
export function jobs(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const boss = new PgBoss({
        connectionString: process.env.DATABASE_URL!,
        application_name: "drinkable-jobs",
      });
      boss.on("error", (error) =>
        console.error("Job queue error", error.message),
      );
      await boss.start();
      await boss.createQueue("email", {
        retryLimit: 5,
        retryDelay: 30,
        retryBackoff: true,
      });
      await boss.createQueue("media", { retryLimit: 3, retryDelay: 10 });
      await boss.createQueue("maintenance");
      return boss;
    })().catch((error) => {
      bossPromise = undefined;
      throw error;
    });
  }
  return bossPromise;
}
export async function enqueueEmail(to: string, subject: string, text: string) {
  return (await jobs()).send("email", { to, subject, text });
}
