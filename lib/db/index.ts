import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Falta la variable de entorno DATABASE_URL. Definila en .env.local (ver .env.example).",
  );
}

const pool = new Pool({ connectionString });

export const db = drizzle({ client: pool, schema, casing: "snake_case" });

export * from "./schema";
