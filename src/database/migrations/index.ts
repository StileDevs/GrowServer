import type { Migration } from "kysely/migration";
import * as m20260831_01_init_schema from "./20260831_01_init_schema";
import * as m20260905_02_better_auth_schema from "./20260905_02_better_auth_schema";

/**
 * Static registry of all migrations bundled with the application.
 */
export const migrations: Record<string, Migration> = {
  "20260831_01_init_schema": m20260831_01_init_schema,
  "20260905_02_better_auth_schema": m20260905_02_better_auth_schema,
};
