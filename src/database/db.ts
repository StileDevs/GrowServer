import { createClient } from "@libsql/client";
import { Kysely } from "kysely";
import { LibSQLDialect } from "kysely-turso/libsql";
import { existsSync, mkdirSync } from "node:fs";
import type { Database } from "./tables";

export * from "./tables";

if (!existsSync("data")) {
  mkdirSync("data", { recursive: true });
}

export const db = new Kysely<Database>({
  dialect: new LibSQLDialect({
    client: createClient({ url: "file:data/local.db" }),
  }),
});

