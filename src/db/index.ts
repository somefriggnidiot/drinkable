import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const globalDatabase = globalThis as unknown as { drinkablePool?: Pool };
export const pool =
  globalDatabase.drinkablePool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
if (process.env.NODE_ENV !== "production") globalDatabase.drinkablePool = pool;
export const db = drizzle(pool, { schema });
