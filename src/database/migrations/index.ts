import type { Migration } from "kysely/migration";
import * as m20260831_01_init_schema from "./20260831_01_init_schema";
import * as m20260905_02_better_auth_schema from "./20260905_02_better_auth_schema";
import * as m20261108_03_player_stats from "./20261108_03_player_stats";
import * as m20261108_04_home_world from "./20261108_04_home_world";

/**
 * Static registry of all migrations bundled with the application.
 */
export const migrations: Record<string, Migration> = {
  "20260831_01_init_schema": m20260831_01_init_schema,
  "20260905_02_better_auth_schema": m20260905_02_better_auth_schema,
  "20261108_03_player_stats": m20261108_03_player_stats,
  "20261108_04_home_world": m20261108_04_home_world,
};
